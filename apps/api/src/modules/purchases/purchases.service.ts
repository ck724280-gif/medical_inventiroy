import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePurchaseDto,
  RecordPurchasePaymentDto,
} from './dto/create-purchase.dto';
import {
  PurchaseStatus,
  StockMovementType,
  MovementDirection,
  BatchStatus,
} from '@medical-inventory/shared-types';
import { calculateLineTotal } from '@medical-inventory/shared-utils';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    branchId?: string;
    supplierId?: string;
    status?: PurchaseStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId && query.branchId !== 'all' && query.branchId !== 'ALL') {
      where.branchId = query.branchId;
    }
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.status) where.status = query.status;
    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, purchases] = await Promise.all([
      this.prisma.purchaseInvoice.count({ where }),
      this.prisma.purchaseInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          payments: { select: { id: true, amount: true, paymentMode: true, paidAt: true } },
          items: {
            include: {
              medicine: {
                select: {
                  id: true,
                  name: true,
                  genericName: true,
                  sku: true,
                  dosageForm: true,
                  barcode: true,
                  composition: true,
                  baseUnit: true,
                  taxPercent: true,
                  stripsPerBox: true,
                  tabletsPerStrip: true,
                },
              },
            },
          },
          _count: { select: { items: true, payments: true } },
        },
      }),
    ]);

    const formattedPurchases = purchases.map((p) => {
      const paidAmount = p.payments ? p.payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0) : 0;
      const totalAmount = Number(p.totalAmount || 0);
      const balanceDue = Math.max(0, totalAmount - paidAmount);
      let paymentStatus = 'UNPAID';
      if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIAL';
      }

      return {
        ...p,
        paidAmount,
        balanceDue,
        paymentStatus,
      };
    });

    return {
      data: formattedPurchases,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        approvedByUser: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                genericName: true,
                sku: true,
                dosageForm: true,
                baseUnit: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        returns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase invoice with ID ${id} not found`);
    }

    const paidAmount = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = purchase.totalAmount - paidAmount;

    return {
      ...purchase,
      paidAmount,
      balanceDue,
    };
  }

  /**
   * Creates a purchase invoice (DRAFT or CONFIRMED).
   * When status is CONFIRMED, executes complete inventory receiving transaction.
   */
  async create(dto: CreatePurchaseDto, userId: string, isDraft = false) {
    // 1. Resolve branchId if omitted
    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch =
        (await this.prisma.branch.findFirst({ where: { isDefault: true } })) ||
        (await this.prisma.branch.findFirst());
      if (!defaultBranch) {
        throw new BadRequestException('No branch configured in system.');
      }
      branchId = defaultBranch.id;
    }

    // 2. Generate invoiceNumber if omitted
    const invoiceNumber = dto.invoiceNumber?.trim() || `PUR-${Date.now()}`;

    const existing = await this.prisma.purchaseInvoice.findUnique({
      where: { invoiceNumber },
    });

    if (existing) {
      throw new ConflictException(`Invoice number '${invoiceNumber}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let grandTotal = 0;

      const processedItems = dto.items.map((item) => {
        const line = calculateLineTotal(
          item.qty,
          item.purchasePrice,
          item.discountPercent || 0,
          item.taxPercent || 0
        );

        subtotal += line.subtotal;
        totalDiscount += line.discountAmount;
        totalTax += line.taxAmount;
        grandTotal += line.total;

        return {
          ...item,
          mfgDate: new Date(item.mfgDate),
          expiryDate: new Date(item.expiryDate),
          lineTotal: line.total,
        };
      });

      const status = isDraft ? PurchaseStatus.DRAFT : PurchaseStatus.CONFIRMED;

      const purchase = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          supplierId: dto.supplierId,
          branchId,
          status,
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          totalAmount: grandTotal,
          notes: dto.notes || null,
          createdByUserId: userId,
          confirmedAt: isDraft ? null : new Date(),
          items: {
            create: processedItems.map((item) => ({
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              qty: item.qty,
              unitId: item.unitId || null,
              purchasePrice: item.purchasePrice,
              mrp: item.mrp,
              sellingPrice: item.sellingPrice,
              taxPercent: item.taxPercent || 0,
              discountPercent: item.discountPercent || 0,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      // If CONFIRMED immediately, post to Batches and Stock Movements
      if (!isDraft) {
        for (const item of purchase.items) {
          // Upsert Batch
          let batch = await tx.batch.findUnique({
            where: {
              medicineId_branchId_batchNumber: {
                medicineId: item.medicineId,
                branchId,
                batchNumber: item.batchNumber,
              },
            },
          });

          if (batch) {
            batch = await tx.batch.update({
              where: { id: batch.id },
              data: {
                currentQty: batch.currentQty + item.qty,
                purchasePrice: item.purchasePrice,
                mrp: item.mrp,
                sellingPrice: item.sellingPrice,
                taxPercent: item.taxPercent,
                expiryDate: item.expiryDate,
                mfgDate: item.mfgDate,
                status: BatchStatus.ACTIVE,
              },
            });
          } else {
            batch = await tx.batch.create({
              data: {
                medicineId: item.medicineId,
                branchId,
                batchNumber: item.batchNumber,
                mfgDate: item.mfgDate,
                expiryDate: item.expiryDate,
                supplierId: dto.supplierId,
                purchaseInvoiceId: purchase.id,
                purchasePrice: item.purchasePrice,
                mrp: item.mrp,
                sellingPrice: item.sellingPrice,
                taxPercent: item.taxPercent,
                initialQty: item.qty,
                currentQty: item.qty,
                status: BatchStatus.ACTIVE,
              },
            });
          }

          // Link batchId on purchaseItem
          await tx.purchaseItem.update({
            where: { id: item.id },
            data: { batchId: batch.id },
          });

          // Record immutable StockMovement (PURCHASE IN)
          await tx.stockMovement.create({
            data: {
              branchId,
              medicineId: item.medicineId,
              batchId: batch.id,
              qty: item.qty,
              direction: MovementDirection.IN,
              type: StockMovementType.PURCHASE,
              referenceType: 'PurchaseInvoice',
              referenceId: purchase.id,
              userId,
              reason: `Purchase Invoice #${purchase.invoiceNumber}`,
            },
          });
        }

        // Update supplier balance
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: {
            currentBalance: { increment: grandTotal },
          },
        });

        // If initial payment was made during creation, record it
        if (dto.paidAmount && Number(dto.paidAmount) > 0) {
          const initialPaid = Math.min(grandTotal, Number(dto.paidAmount));
          await tx.purchasePayment.create({
            data: {
              purchaseInvoiceId: purchase.id,
              supplierId: dto.supplierId,
              amount: initialPaid,
              paymentMode: (dto.paymentMode as any) || 'BANK_TRANSFER',
              notes: 'Initial payment recorded during purchase inward',
              createdByUserId: userId,
            },
          });

          await tx.supplier.update({
            where: { id: dto.supplierId },
            data: {
              currentBalance: { decrement: initialPaid },
            },
          });
        }

        // If converted from a Purchase Order, mark the Purchase Order as FULLY_RECEIVED
        if (dto.purchaseOrderId) {
          await tx.purchaseOrder.update({
            where: { id: dto.purchaseOrderId },
            data: { status: 'FULLY_RECEIVED' },
          }).catch(() => {
            // ignore if po was already completed or not found
          });
        }
      }

      return purchase;
    });
  }

  /**
   * Confirms and posts a DRAFT purchase invoice into live stock.
   */
  async confirmPurchase(id: string, userId: string) {
    const purchase = await this.findOne(id);

    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException(`Purchase invoice is already in ${purchase.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        let batch = await tx.batch.findUnique({
          where: {
            medicineId_branchId_batchNumber: {
              medicineId: item.medicineId,
              branchId: purchase.branchId,
              batchNumber: item.batchNumber,
            },
          },
        });

        if (batch) {
          batch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              currentQty: batch.currentQty + item.qty,
              purchasePrice: item.purchasePrice,
              mrp: item.mrp,
              sellingPrice: item.sellingPrice,
              taxPercent: item.taxPercent,
              status: BatchStatus.ACTIVE,
            },
          });
        } else {
          batch = await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              branchId: purchase.branchId,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              supplierId: purchase.supplierId,
              purchaseInvoiceId: purchase.id,
              purchasePrice: item.purchasePrice,
              mrp: item.mrp,
              sellingPrice: item.sellingPrice,
              taxPercent: item.taxPercent,
              initialQty: item.qty,
              currentQty: item.qty,
              status: BatchStatus.ACTIVE,
            },
          });
        }

        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { batchId: batch.id },
        });

        await tx.stockMovement.create({
          data: {
            branchId: purchase.branchId,
            medicineId: item.medicineId,
            batchId: batch.id,
            qty: item.qty,
            direction: MovementDirection.IN,
            type: StockMovementType.PURCHASE,
            referenceType: 'PurchaseInvoice',
            referenceId: purchase.id,
            userId,
            reason: `Confirmed Purchase Invoice #${purchase.invoiceNumber}`,
          },
        });
      }

      await tx.purchaseInvoice.update({
        where: { id },
        data: {
          status: PurchaseStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: {
          currentBalance: { increment: purchase.totalAmount },
        },
      });

      return this.findOne(id);
    });
  }

  async recordPayment(purchaseId: string, dto: RecordPurchasePaymentDto, userId: string) {
    const purchase = await this.findOne(purchaseId);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.purchasePayment.create({
        data: {
          purchaseInvoiceId: purchaseId,
          supplierId: purchase.supplierId,
          amount: dto.amount,
          paymentMode: dto.paymentMode,
          referenceNumber: dto.referenceNumber || null,
          notes: dto.notes || null,
          createdByUserId: userId,
        },
      });

      // Deduct supplier balance
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: {
          currentBalance: { decrement: dto.amount },
        },
      });

      return payment;
    });
  }

  async update(id: string, dto: any, userId: string) {
    const purchase = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase invoice with ID ${id} not found`);
    }

    if (purchase.status !== PurchaseStatus.DRAFT) {
      return this.prisma.purchaseInvoice.update({
        where: { id },
        data: {
          notes: dto.notes !== undefined ? dto.notes : purchase.notes,
          supplierId: dto.supplierId || purchase.supplierId,
        },
        include: {
          supplier: true,
          items: { include: { medicine: true } },
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotal = purchase.subtotal;
      let totalDiscount = purchase.discountAmount;
      let totalTax = purchase.taxAmount;
      let grandTotal = purchase.totalAmount;

      if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
        subtotal = 0;
        totalDiscount = 0;
        totalTax = 0;
        grandTotal = 0;

        await tx.purchaseItem.deleteMany({
          where: { purchaseInvoiceId: id },
        });

        for (const item of dto.items) {
          const line = calculateLineTotal(
            item.qty,
            item.purchasePrice,
            item.discountPercent || 0,
            item.taxPercent || 0
          );

          subtotal += line.subtotal;
          totalDiscount += line.discountAmount;
          totalTax += line.taxAmount;
          grandTotal += line.total;

          await tx.purchaseItem.create({
            data: {
              purchaseInvoiceId: id,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              mfgDate: new Date(item.mfgDate),
              expiryDate: new Date(item.expiryDate),
              qty: item.qty,
              unitId: item.unitId || null,
              purchasePrice: item.purchasePrice,
              mrp: item.mrp,
              sellingPrice: item.sellingPrice,
              taxPercent: item.taxPercent || 0,
              discountPercent: item.discountPercent || 0,
              lineTotal: line.total,
            },
          });
        }
      }

      const updated = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          supplierId: dto.supplierId || purchase.supplierId,
          invoiceNumber: dto.invoiceNumber || purchase.invoiceNumber,
          notes: dto.notes !== undefined ? dto.notes : purchase.notes,
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          totalAmount: grandTotal,
        },
        include: {
          supplier: true,
          items: { include: { medicine: true } },
        },
      });

      return updated;
    });
  }

  async delete(id: string) {
    const purchase = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase invoice with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (purchase.status === PurchaseStatus.CONFIRMED) {
        for (const item of purchase.items) {
          if (item.batchId) {
            const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
            if (batch) {
              const newQty = Math.max(0, batch.currentQty - item.qty);
              await tx.batch.update({
                where: { id: item.batchId },
                data: { currentQty: newQty },
              });
            }
          }
        }

        await tx.stockMovement.deleteMany({
          where: { referenceId: id, referenceType: 'PurchaseInvoice' },
        });

        const paidAmount = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const unpaidAmount = purchase.totalAmount - paidAmount;
        if (unpaidAmount > 0) {
          await tx.supplier.update({
            where: { id: purchase.supplierId },
            data: { currentBalance: { decrement: unpaidAmount } },
          });
        }
      }

      await tx.purchasePayment.deleteMany({ where: { purchaseInvoiceId: id } });
      await tx.purchaseItem.deleteMany({ where: { purchaseInvoiceId: id } });
      await tx.purchaseInvoice.delete({ where: { id } });

      return { success: true, id };
    });
  }
}
