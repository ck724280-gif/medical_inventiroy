import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutSaleDto } from './dto/create-sale.dto';
import {
  SaleStatus,
  PaymentStatus,
  StockMovementType,
  MovementDirection,
  BatchStatus,
  PaperWidth,
} from '@medical-inventory/shared-types';
import {
  calculateLineTotal,
  formatInvoiceNumber,
  formatDateTime,
  formatDate,
  formatCurrency,
  allocateBatchesFefo,
} from '@medical-inventory/shared-utils';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    branchId?: string;
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { mobile: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, sales] = await Promise.all([
      this.prisma.salesInvoice.count({ where }),
      this.prisma.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          branch: { select: { id: true, name: true, code: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
    ]);

    return {
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: {
          include: { settings: true },
        },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
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
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
                mrp: true,
              },
            },
          },
        },
        payments: true,
        returns: {
          include: { items: true },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sales invoice with ID ${id} not found`);
    }

    return sale;
  }

  async checkout(dto: CheckoutSaleDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve or create customer if mobile is provided
      let customerId = dto.customerId || null;
      if (!customerId && dto.customerMobile) {
        let existingCustomer = await tx.customer.findUnique({
          where: { mobile: dto.customerMobile },
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const newCust = await tx.customer.create({
            data: {
              name: dto.customerName || 'Walk-in Customer',
              mobile: dto.customerMobile,
            },
          });
          customerId = newCust.id;
        }
      }

      // 2. Fetch and increment branch sequential invoice number safely
      const branchSettings = await tx.branchSettings.findUnique({
        where: { branchId: dto.branchId },
      });

      const prefix = branchSettings?.invoicePrefix || 'INV';
      const seqNum = branchSettings?.invoiceNextNumber || 1;
      const invoiceNumber = formatInvoiceNumber(prefix, seqNum, 6);

      // Increment sequence for next transaction
      await tx.branchSettings.update({
        where: { branchId: dto.branchId },
        data: { invoiceNextNumber: seqNum + 1 },
      });

      // 3. Process items with FEFO or specific batch allocation
      const processedSalesItems: {
        medicineId: string;
        batchId: string;
        qty: number;
        unitId?: string | null;
        rate: number;
        mrp: number;
        discountPercent: number;
        taxPercent: number;
        lineTotal: number;
      }[] = [];

      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let grandTotal = 0;

      for (const cartItem of dto.items) {
        const medicine = await tx.medicine.findUnique({
          where: { id: cartItem.medicineId },
        });

        if (!medicine || !medicine.isActive) {
          throw new BadRequestException(`Medicine '${cartItem.medicineId}' is inactive or not found`);
        }

        if (cartItem.batchId) {
          // Specific batch chosen
          const batch = await tx.batch.findUnique({
            where: { id: cartItem.batchId },
          });

          if (!batch || batch.status !== BatchStatus.ACTIVE) {
            throw new BadRequestException(`Batch is invalid or expired for ${medicine.name}`);
          }

          if (batch.currentQty < cartItem.qty) {
            throw new BadRequestException(
              `Insufficient stock in batch ${batch.batchNumber} for ${medicine.name}. Available: ${batch.currentQty}, Requested: ${cartItem.qty}`
            );
          }

          const rate = cartItem.rate ?? batch.sellingPrice;
          const line = calculateLineTotal(
            cartItem.qty,
            rate,
            cartItem.discountPercent || 0,
            batch.taxPercent
          );

          subtotal += line.subtotal;
          totalDiscount += line.discountAmount;
          totalTax += line.taxAmount;
          grandTotal += line.total;

          processedSalesItems.push({
            medicineId: medicine.id,
            batchId: batch.id,
            qty: cartItem.qty,
            unitId: cartItem.unitId || null,
            rate,
            mrp: batch.mrp,
            discountPercent: cartItem.discountPercent || 0,
            taxPercent: batch.taxPercent,
            lineTotal: line.total,
          });
        } else {
          // FEFO Automatic Batch Allocation
          const activeBatches = await tx.batch.findMany({
            where: {
              medicineId: medicine.id,
              branchId: dto.branchId,
              status: BatchStatus.ACTIVE,
              expiryDate: { gt: new Date() }, // Block expired
              currentQty: { gt: 0 },
            },
            orderBy: { expiryDate: 'asc' }, // Earliest expiry first
          });

          const fefoResult = allocateBatchesFefo(activeBatches as any, cartItem.qty);

          if (!fefoResult.isFullySatisfied) {
            throw new BadRequestException(
              `Insufficient valid stock for '${medicine.name}'. Available: ${fefoResult.allocatedTotal}, Requested: ${cartItem.qty}`
            );
          }

          for (const alloc of fefoResult.allocations) {
            const rate = cartItem.rate ?? alloc.sellingPrice;
            const line = calculateLineTotal(
              alloc.allocatedQty,
              rate,
              cartItem.discountPercent || 0,
              alloc.taxPercent
            );

            subtotal += line.subtotal;
            totalDiscount += line.discountAmount;
            totalTax += line.taxAmount;
            grandTotal += line.total;

            processedSalesItems.push({
              medicineId: medicine.id,
              batchId: alloc.batchId,
              qty: alloc.allocatedQty,
              unitId: cartItem.unitId || null,
              rate,
              mrp: alloc.sellingPrice,
              discountPercent: cartItem.discountPercent || 0,
              taxPercent: alloc.taxPercent,
              lineTotal: line.total,
            });
          }
        }
      }

      // Apply optional invoice-level discount
      if (dto.invoiceDiscountPercent && dto.invoiceDiscountPercent > 0) {
        const invDiscount = (grandTotal * dto.invoiceDiscountPercent) / 100;
        totalDiscount += invDiscount;
        grandTotal -= invDiscount;
      }

      // 4. Create SalesInvoice
      const totalPaid = dto.payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentStatus = totalPaid >= grandTotal ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNumber,
          branchId: dto.branchId,
          customerId,
          status: SaleStatus.COMPLETED,
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          totalAmount: grandTotal,
          paymentStatus,
          createdByUserId: userId,
          items: {
            create: processedSalesItems.map((item) => ({
              medicineId: item.medicineId,
              batchId: item.batchId,
              qty: item.qty,
              unitId: item.unitId || null,
              rate: item.rate,
              mrp: item.mrp,
              discountPercent: item.discountPercent,
              taxPercent: item.taxPercent,
              lineTotal: item.lineTotal,
            })),
          },
          payments: {
            create: dto.payments.map((p) => ({
              amount: p.amount,
              paymentMode: p.paymentMode,
              referenceNumber: p.referenceNumber || null,
              createdByUserId: userId,
            })),
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      // 5. Deduct Stock from Batches & record Stock Movements
      for (const item of processedSalesItems) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: {
            currentQty: { decrement: item.qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            branchId: dto.branchId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            qty: item.qty,
            direction: MovementDirection.OUT,
            type: StockMovementType.SALE,
            referenceType: 'SalesInvoice',
            referenceId: invoice.id,
            userId,
            reason: `POS Sale Invoice #${invoiceNumber}`,
          },
        });
      }

      return invoice;
    });
  }

  /**
   * Generates formatted receipt data structure for thermal and A4 printers.
   */
  async getReceiptData(invoiceId: string, requestedPaperWidth?: PaperWidth) {
    const sale = await this.findOne(invoiceId);
    const [business, template] = await Promise.all([
      this.prisma.businessSettings.findUnique({ where: { id: 'default' } }),
      this.prisma.receiptTemplate.findFirst({ where: { isDefault: true } }),
    ]);

    const paperWidth = requestedPaperWidth || (sale.branch?.settings?.thermalPaperWidth as PaperWidth) || PaperWidth.WIDTH_58MM;

    const receiptItems = sale.items.map((item) => {
      return {
        name: item.medicine.name,
        batch: item.batch.batchNumber,
        expiry: formatDate(item.batch.expiryDate, 'MM-YYYY'),
        qty: item.qty,
        unit: item.medicine.baseUnit.abbreviation,
        rate: item.rate,
        mrp: item.mrp,
        discount: item.discountPercent,
        tax: item.taxPercent,
        amount: item.lineTotal,
      };
    });

    return {
      storeName: business?.name || 'MedCare Pharmacy',
      logo: business?.logo || null,
      address: `${sale.branch.address}, ${sale.branch.city}, ${sale.branch.state} - ${business?.pinZip || ''}`,
      phone: sale.branch.phone || business?.phone || '',
      email: sale.branch.email || business?.email || '',
      gstNumber: business?.gstNumber || '',
      pharmacyLicense: business?.pharmacyLicense || '',
      invoiceNumber: sale.invoiceNumber,
      date: formatDate(sale.createdAt),
      time: formatDateTime(sale.createdAt).split(' ').slice(1).join(' '),
      cashierName: `${sale.createdByUser.firstName} ${sale.createdByUser.lastName}`,
      customerName: sale.customer?.name || 'Walk-in Customer',
      customerMobile: sale.customer?.mobile || null,
      items: receiptItems,
      subtotal: sale.subtotal,
      discountTotal: sale.discountAmount,
      taxTotal: sale.taxAmount,
      grandTotal: sale.totalAmount,
      paymentMode: sale.payments.map((p) => p.paymentMode).join(', '),
      payments: sale.payments.map((p) => ({ mode: p.paymentMode, amount: p.amount })),
      headerText: template?.headerText || null,
      footerText: template?.footerText || null,
      thankYouMessage: template?.thankYouMessage || 'Thank You! Get Well Soon',
      returnPolicy: template?.returnPolicy || 'Goods once sold can only be returned within 7 days with original invoice.',
      paperWidth,
    };
  }
}
