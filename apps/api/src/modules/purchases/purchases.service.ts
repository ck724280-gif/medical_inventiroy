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
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
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
          _count: { select: { items: true, payments: true } },
        },
      }),
    ]);

    return {
      data: purchases,
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
    const existing = await this.prisma.purchaseInvoice.findUnique({
      where: { invoiceNumber: dto.invoiceNumber },
    });

    if (existing) {
      throw new ConflictException(`Invoice number '${dto.invoiceNumber}' already exists`);
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
          invoiceNumber: dto.invoiceNumber,
          supplierId: dto.supplierId,
          branchId: dto.branchId,
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
                branchId: dto.branchId,
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
                branchId: dto.branchId,
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
              branchId: dto.branchId,
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
}
