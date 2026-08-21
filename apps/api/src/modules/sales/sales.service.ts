import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutSaleDto } from './dto/create-sale.dto';
import {
  SaleStatus,
  PaymentStatus,
  StockMovementType,
  MovementDirection,
  BatchStatus,
  PaymentMode,
  PaperWidth,
  ShiftStatus,
} from '@medical-inventory/shared-types';
import {
  calculateLineTotal,
  calculateDetailedLineTotal,
  formatInvoiceNumber,
  formatDateTime,
  formatDate,
  allocateBatchesFefo,
  convertToBaseUnits,
  resolvePartyItemPrice,
  roundToDecimals,
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
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        prescriptionRecord: true,
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                genericName: true,
                sku: true,
                barcode: true,
                dosageForm: true,
                baseUnit: true,
                drugSchedule: true,
                isScheduleH: true,
                isScheduleH1: true,
                isScheduleX: true,
              },
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
                mrp: true,
                sellingPrice: true,
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

  /**
   * Concurrency-Safe, Atomic POS Checkout with MRP, Discount, Stock & Shift Guards
   */
  async checkout(dto: CheckoutSaleDto, userId: string) {
    // 0. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.salesInvoice.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { items: true, payments: true },
      });
      if (existing) {
        return existing;
      }
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cannot complete sale with an empty cart');
    }

    // Fetch user and permissions for role-based limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const userRoles = user?.roles.map((r) => r.role.name.toUpperCase()) || [];
    const userPermissions = new Set<string>();
    for (const r of user?.roles || []) {
      for (const p of r.role.permissions) {
        userPermissions.add(p.permission.code);
      }
    }

    const isAdminOrOwner =
      userRoles.includes('ADMIN') ||
      userRoles.includes('OWNER') ||
      userRoles.includes('MANAGER');
    const isPharmacist = userRoles.includes('PHARMACIST');

    // Determine max discount percent allowed for this user
    let maxAllowedDiscount = 15; // default cashier limit: 15%
    if (isAdminOrOwner) {
      maxAllowedDiscount = 100;
    } else if (isPharmacist) {
      maxAllowedDiscount = 30;
    }

    // Check invoice-level discount
    if (
      dto.invoiceDiscountPercent &&
      dto.invoiceDiscountPercent > maxAllowedDiscount
    ) {
      throw new ForbiddenException(
        `Invoice discount of ${dto.invoiceDiscountPercent}% exceeds maximum allowed limit for your role (${maxAllowedDiscount}%). Manager override required.`
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Resolve or create Customer
        let customerId = dto.customerId || null;
        let customerRecord: any = null;

        if (customerId) {
          customerRecord = await tx.customer.findUnique({ where: { id: customerId } });
        } else if (dto.customerMobile) {
          const mobileClean = dto.customerMobile.trim();
          let existingCustomer = await tx.customer.findUnique({
            where: { mobile: mobileClean },
          });

          if (existingCustomer) {
            customerId = existingCustomer.id;
            customerRecord = existingCustomer;
          } else {
            customerRecord = await tx.customer.create({
              data: {
                name: dto.customerName?.trim() || 'Walk-in Customer',
                mobile: mobileClean,
                gstNumber: dto.customerGstin?.trim() || null,
              },
            });
            customerId = customerRecord.id;
          }
        }

        // 2. Fetch and increment Branch sequential invoice number atomically
        let branchSettings = await tx.branchSettings.findUnique({
          where: { branchId: dto.branchId },
        });

        if (!branchSettings) {
          branchSettings = await tx.branchSettings.create({
            data: {
              branchId: dto.branchId,
              invoicePrefix: 'INV',
              invoiceNextNumber: 1,
              thermalPaperWidth: '58mm',
            },
          });
        }

        const prefix = branchSettings.invoicePrefix || 'INV';
        const seqNum = branchSettings.invoiceNextNumber || 1;
        const invoiceNumber = formatInvoiceNumber(prefix, seqNum, 6);

        await tx.branchSettings.update({
          where: { branchId: dto.branchId },
          data: { invoiceNextNumber: seqNum + 1 },
        });

        // 3. Resolve active Cashier Shift (if any)
        let shiftId = dto.shiftId || null;
        if (!shiftId) {
          const activeShift = await tx.cashierShift.findFirst({
            where: {
              userId,
              branchId: dto.branchId,
              status: ShiftStatus.OPEN,
            },
            orderBy: { openedAt: 'desc' },
          });
          if (activeShift) {
            shiftId = activeShift.id;
          }
        }

        // 4. Process Items with Unit Conversion, Pricing, Discount & Stock Locks
        const processedSalesItems: {
          medicineId: string;
          batchId: string;
          qty: number;
          selectedQuantity?: number | null;
          conversionRatio?: number | null;
          unitId?: string | null;
          rate: number;
          mrp: number;
          discountPercent: number;
          taxPercent: number;
          hsnCode: string | null;
          taxableAmount: number;
          cgstAmount: number;
          sgstAmount: number;
          igstAmount: number;
          originalPrice: number | null;
          priceOverrideReason: string | null;
          lineTotal: number;
        }[] = [];

        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let grandTotal = 0;

        const branchRecord = await tx.branch.findUnique({ where: { id: dto.branchId } });
        const isInterState = Boolean(
          branchRecord?.state &&
          customerRecord?.address &&
          !customerRecord.address.toLowerCase().includes(branchRecord.state.toLowerCase())
        );

        for (const cartItem of dto.items) {
          const medicine = await tx.medicine.findUnique({
            where: { id: cartItem.medicineId },
            include: {
              partyPrices: customerId ? { where: { customerId, isActive: true } } : false,
            },
          });

          if (!medicine || !medicine.isActive) {
            throw new BadRequestException(
              `Medicine '${cartItem.medicineId}' is inactive or not found.`
            );
          }

          // Item-level discount validation
          const itemDiscount = Number(cartItem.discountPercent || 0);
          if (itemDiscount > maxAllowedDiscount) {
            throw new ForbiddenException(
              `Discount of ${itemDiscount}% on '${medicine.name}' exceeds maximum allowed limit for your role (${maxAllowedDiscount}%).`
            );
          }

          // Multi-unit conversion to base units
          const stripsPerBox = medicine.stripsPerBox || 10;
          const tabletsPerStrip = medicine.tabletsPerStrip || 10;
          const rawQty =
            cartItem.selectedQuantity !== undefined && cartItem.selectedQuantity !== null
              ? Number(cartItem.selectedQuantity)
              : Number(cartItem.qty);

          const baseQty = cartItem.unitLevel
            ? convertToBaseUnits(rawQty, cartItem.unitLevel, stripsPerBox, tabletsPerStrip)
            : Math.round(rawQty);
          
          let multiplier = 1;
          if (cartItem.unitLevel === 'STRIP') multiplier = tabletsPerStrip;
          if (cartItem.unitLevel === 'BOX') multiplier = stripsPerBox * tabletsPerStrip;

          if (baseQty <= 0) {
            throw new BadRequestException(
              `Invalid quantity '${baseQty}' for medicine '${medicine.name}'.`
            );
          }

          // Rate resolution & Party Pricing
          let itemRate = cartItem.rate;
          if (itemRate !== undefined && itemRate !== null && multiplier > 1) {
             itemRate = Number((itemRate / multiplier).toFixed(4));
          }
          let itemDiscountPercent = itemDiscount;

          if (itemRate === undefined || itemRate === null) {
            const activeRule = (medicine as any).partyPrices?.[0];
            const resolvedPrice = resolvePartyItemPrice(
              medicine.defaultSellingPrice,
              medicine.mrp,
              activeRule || null
            );
            itemRate = resolvedPrice.price;
            if (resolvedPrice.discountPercent > 0 && itemDiscountPercent === 0) {
              itemDiscountPercent = resolvedPrice.discountPercent;
            }
          }

          if (cartItem.batchId) {
            // Specific batch selected
            const batch = await tx.batch.findUnique({
              where: { id: cartItem.batchId },
            });

            if (!batch || batch.status !== BatchStatus.ACTIVE) {
              throw new BadRequestException(
                `Batch '${batch?.batchNumber || cartItem.batchId}' is invalid or expired for ${medicine.name}.`
              );
            }

            if (new Date(batch.expiryDate) <= new Date()) {
              throw new BadRequestException(
                `Batch '${batch.batchNumber}' for ${medicine.name} has expired on ${formatDate(batch.expiryDate)} and cannot be sold.`
              );
            }

            if (batch.currentQty < baseQty) {
              throw new BadRequestException(
                `Insufficient stock in batch '${batch.batchNumber}' for ${medicine.name}. Available: ${batch.currentQty}, Requested: ${baseQty}.`
              );
            }

            const effectiveRate = itemRate ?? batch.sellingPrice;

            // MRP Protection Guard
            if (effectiveRate > batch.mrp && !userPermissions.has('price.override') && !isAdminOrOwner) {
              throw new BadRequestException(
                `Selling price (₹${effectiveRate}) cannot exceed MRP (₹${batch.mrp}) for ${medicine.name}.`
              );
            }

            // Price override audit check
            let originalPrice: number | null = null;
            let priceOverrideReason: string | null = null;
            if (effectiveRate !== batch.sellingPrice) {
              originalPrice = batch.sellingPrice;
              priceOverrideReason = cartItem.priceOverrideReason || 'Cashier Manual Override';
            }

            const lineDetails = calculateDetailedLineTotal(
              baseQty,
              effectiveRate,
              itemDiscountPercent,
              batch.taxPercent,
              isInterState
            );

            subtotal += lineDetails.subtotal;
            totalDiscount += lineDetails.discountAmount;
            totalTax += lineDetails.taxAmount;
            grandTotal += lineDetails.lineTotal;

            processedSalesItems.push({
              medicineId: medicine.id,
              batchId: batch.id,
              qty: baseQty,
              selectedQuantity: rawQty,
              conversionRatio: rawQty > 0 ? Number((baseQty / rawQty).toFixed(2)) : 1,
              unitId: cartItem.unitId || null,
              rate: effectiveRate,
              mrp: batch.mrp,
              discountPercent: itemDiscountPercent,
              taxPercent: batch.taxPercent,
              hsnCode: medicine.hsnCode || null,
              taxableAmount: lineDetails.taxableAmount,
              cgstAmount: lineDetails.cgstAmount,
              sgstAmount: lineDetails.sgstAmount,
              igstAmount: lineDetails.igstAmount,
              originalPrice,
              priceOverrideReason,
              lineTotal: lineDetails.lineTotal,
            });
          } else {
            // FEFO Automatic Batch Allocation
            const now = new Date();
            const activeBatches = await tx.batch.findMany({
              where: {
                medicineId: medicine.id,
                branchId: dto.branchId,
                status: BatchStatus.ACTIVE,
                expiryDate: { gt: now },
                currentQty: { gt: 0 },
              },
              orderBy: { expiryDate: 'asc' },
            });

            const fefoResult = allocateBatchesFefo(activeBatches as any, baseQty);

            if (!fefoResult.isFullySatisfied) {
              throw new BadRequestException(
                `Insufficient non-expired stock for '${medicine.name}'. Available: ${fefoResult.allocatedTotal}, Requested: ${baseQty}.`
              );
            }

            for (const alloc of fefoResult.allocations) {
              const effectiveRate = itemRate ?? alloc.sellingPrice;

              if (effectiveRate > alloc.mrp && !userPermissions.has('price.override') && !isAdminOrOwner) {
                throw new BadRequestException(
                  `Selling price (₹${effectiveRate}) cannot exceed MRP (₹${alloc.mrp}) for ${medicine.name}.`
                );
              }

              let originalPrice: number | null = null;
              let priceOverrideReason: string | null = null;
              if (effectiveRate !== alloc.sellingPrice) {
                originalPrice = alloc.sellingPrice;
                priceOverrideReason = cartItem.priceOverrideReason || 'Cashier Manual Override';
              }

              const lineDetails = calculateDetailedLineTotal(
                alloc.allocatedQty,
                effectiveRate,
                itemDiscountPercent,
                alloc.taxPercent,
                isInterState
              );

              subtotal += lineDetails.subtotal;
              totalDiscount += lineDetails.discountAmount;
              totalTax += lineDetails.taxAmount;
              grandTotal += lineDetails.lineTotal;

              processedSalesItems.push({
                medicineId: medicine.id,
                batchId: alloc.batchId,
                qty: alloc.allocatedQty,
                selectedQuantity: rawQty,
                conversionRatio: rawQty > 0 ? Number((baseQty / rawQty).toFixed(2)) : 1,
                unitId: cartItem.unitId || null,
                rate: effectiveRate,
                mrp: alloc.mrp,
                discountPercent: itemDiscountPercent,
                taxPercent: alloc.taxPercent,
                hsnCode: medicine.hsnCode || null,
                taxableAmount: lineDetails.taxableAmount,
                cgstAmount: lineDetails.cgstAmount,
                sgstAmount: lineDetails.sgstAmount,
                igstAmount: lineDetails.igstAmount,
                originalPrice,
                priceOverrideReason,
                lineTotal: lineDetails.lineTotal,
              });
            }
          }
        }

        // Apply optional invoice-level discount
        if (dto.invoiceDiscountPercent && dto.invoiceDiscountPercent > 0) {
          const invDiscount = roundToDecimals((grandTotal * dto.invoiceDiscountPercent) / 100);
          totalDiscount += invDiscount;
          grandTotal = Math.max(0, roundToDecimals(grandTotal - invDiscount));
        }

        // 5. Payment Validation & Credit Sales Limit Checks
        const paymentsList = dto.payments || [{ paymentMode: PaymentMode.CASH, amount: grandTotal }];
        const totalPaid = roundToDecimals(
          paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        );

        let hasCreditPayment = false;
        let creditAmount = 0;

        for (const p of paymentsList) {
          if (p.paymentMode === PaymentMode.CREDIT) {
            hasCreditPayment = true;
            creditAmount += Number(p.amount) || 0;
          }
        }

        if (hasCreditPayment) {
          if (!customerId || !customerRecord) {
            throw new BadRequestException('Credit sale requires an identified registered customer.');
          }

          if (
            customerRecord.creditLimit > 0 &&
            customerRecord.currentBalance + creditAmount > customerRecord.creditLimit &&
            !isAdminOrOwner
          ) {
            throw new ForbiddenException(
              `Credit limit exceeded for customer '${customerRecord.name}'. Current Balance: ₹${customerRecord.currentBalance}, Limit: ₹${customerRecord.creditLimit}, Requested: ₹${creditAmount}.`
            );
          }

          // Increment customer outstanding balance
          await tx.customer.update({
            where: { id: customerId },
            data: {
              currentBalance: { increment: creditAmount },
            },
          });
        }

        const paymentStatus =
          totalPaid >= grandTotal
            ? PaymentStatus.PAID
            : totalPaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.UNPAID;

        // 6. Create SalesInvoice
        const invoice = await tx.salesInvoice.create({
          data: {
            invoiceNumber,
            branchId: dto.branchId,
            customerId,
            customerGstin: dto.customerGstin || null,
            isB2B: Boolean(dto.isB2B || dto.customerGstin),
            status: SaleStatus.COMPLETED,
            subtotal: roundToDecimals(subtotal),
            discountAmount: roundToDecimals(totalDiscount),
            taxAmount: roundToDecimals(totalTax),
            totalAmount: roundToDecimals(grandTotal),
            paymentStatus,
            createdByUserId: userId,
            shiftId,
            idempotencyKey: dto.idempotencyKey || null,
            isReprint: Boolean(dto.isReprint),
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
                hsnCode: item.hsnCode,
                taxableAmount: item.taxableAmount,
                cgstAmount: item.cgstAmount,
                sgstAmount: item.sgstAmount,
                igstAmount: item.igstAmount,
                originalPrice: item.originalPrice,
                priceOverrideReason: item.priceOverrideReason,
                lineTotal: item.lineTotal,
              })),
            },
            payments: {
              create: paymentsList.map((p) => ({
                amount: roundToDecimals(p.amount),
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

        // 7. Prescription Record (Schedule H / Doctor Rx compliance)
        if (dto.prescription) {
          await tx.prescriptionRecord.create({
            data: {
              salesInvoiceId: invoice.id,
              doctorName: dto.prescription.doctorName,
              doctorRegNo: dto.prescription.doctorRegNo,
              patientName: dto.prescription.patientName,
              patientAge: Number(dto.prescription.patientAge),
              patientAddress: dto.prescription.patientAddress || null,
              prescriptionNumber: dto.prescription.prescriptionNumber || null,
              drugSchedule: dto.prescription.drugSchedule || 'SCHEDULE_H',
            },
          });
        }

        // 8. Atomic Concurrency-Safe Stock Deduction & Ledger Creation
        for (const item of processedSalesItems) {
          const updateResult = await tx.batch.updateMany({
            where: {
              id: item.batchId,
              currentQty: { gte: item.qty },
            },
            data: {
              currentQty: { decrement: item.qty },
            },
          });

          if (updateResult.count === 0) {
            throw new BadRequestException(
              `Stock concurrency error: Insufficient stock remaining in batch #${item.batchId}. It may have been sold by another cashier simultaneously.`
            );
          }

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

        // 9. Audit Logging for sensitive overrides
        for (const item of processedSalesItems) {
          if (item.originalPrice !== null && item.originalPrice !== item.rate) {
            await tx.auditLog.create({
              data: {
                userId,
                action: 'price_override',
                entity: 'SalesItem',
                entityId: invoice.id,
                oldValue: JSON.stringify({ price: item.originalPrice }),
                newValue: JSON.stringify({ price: item.rate, reason: item.priceOverrideReason }),
              },
            });
          }
        }

        return invoice;
      },
      { timeout: 30000, maxWait: 10000 }
    );
  }

  async getReceiptData(invoiceId: string, requestedPaperWidth?: PaperWidth, isReprint?: boolean) {
    const sale = await this.findOne(invoiceId);
    const [business, template] = await Promise.all([
      this.prisma.businessSettings.findUnique({ where: { id: 'default' } }),
      this.prisma.receiptTemplate.findFirst({ where: { isDefault: true } }),
    ]);

    const paperWidth =
      requestedPaperWidth ||
      (sale.branch?.settings?.thermalPaperWidth as PaperWidth) ||
      PaperWidth.WIDTH_58MM;

    const receiptItems = sale.items.map((item) => {
      return {
        name: item.medicine.name,
        batch: item.batch.batchNumber,
        expiry: formatDate(item.batch.expiryDate, 'MM-YYYY'),
        qty: item.qty,
        unit: item.medicine.baseUnit?.abbreviation || 'PCS',
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
      returnPolicy:
        template?.returnPolicy ||
        'Goods once sold can only be returned within 7 days with original invoice.',
      paperWidth,
      isReprint: Boolean(isReprint || sale.isReprint),
    };
  }

  async deleteSalesInvoice(id: string) {
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sales invoice with ID ${id} not found`);
    }

    // Perform inside a database transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // 1. Reverse Inventory stock changes
      for (const item of sale.items) {
        if (item.batchId) {
          // Add quantity back to the original batch
          await tx.batch.update({
            where: { id: item.batchId },
            data: {
              currentQty: {
                increment: item.qty,
              },
            },
          });
        }

        // Also record a stock movement log for this reversal/deletion
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchId: item.batchId,
            branchId: sale.branchId,
            userId: sale.createdByUserId,
            type: 'ADJUSTMENT',
            direction: 'IN',
            qty: item.qty,
            reason: `Sales Invoice ${sale.invoiceNumber} deleted/cancelled. Stock restored.`,
          },
        });
      }

      // 2. Reverse Customer credit/balance changes (if customerId is present)
      if (sale.customerId) {
        // Calculate credit amount (total amount unpaid / outstanding customer balance)
        let unpaidAmount = 0;
        const totalPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        unpaidAmount = Number(sale.totalAmount) - totalPaid;

        if (unpaidAmount > 0) {
          // Decrement the customer's outstanding balance
          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              currentBalance: {
                decrement: unpaidAmount,
              },
            },
          });
        }
      }

      // 3. Delete payments
      await tx.salesPayment.deleteMany({
        where: { salesInvoiceId: id },
      });

      // 4. Delete items
      await tx.salesItem.deleteMany({
        where: { salesInvoiceId: id },
      });

      // 5. Delete prescription record (if any)
      await tx.prescriptionRecord.deleteMany({
        where: { salesInvoiceId: id },
      });

      // 6. Delete invoice
      await tx.salesInvoice.delete({
        where: { id },
      });
    });

    return { success: true, message: `Invoice ${sale.invoiceNumber} successfully deleted and stock restored.` };
  }

  async updateSalesInvoice(id: string, dto: any) {
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sales invoice with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.createdAt !== undefined) updateData.createdAt = new Date(dto.createdAt);
    if (dto.paymentStatus !== undefined) updateData.paymentStatus = dto.paymentStatus;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;

    await this.prisma.$transaction(async (tx) => {
      // If customer is changing and there's an outstanding balance, adjust ledger
      if (dto.customerId !== undefined && dto.customerId !== sale.customerId) {
        const totalPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const unpaidAmount = Number(sale.totalAmount) - totalPaid;

        if (unpaidAmount > 0) {
          // Remove from old customer balance (if existed)
          if (sale.customerId) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: { currentBalance: { decrement: unpaidAmount } },
            });
          }
          // Add to new customer balance (if changing to a valid customer)
          if (dto.customerId) {
            await tx.customer.update({
              where: { id: dto.customerId },
              data: { currentBalance: { increment: unpaidAmount } },
            });
          }
        }
      }

      // If payment mode is changing, update the payment records mode
      if (dto.paymentMode !== undefined) {
        await tx.salesPayment.updateMany({
          where: { salesInvoiceId: id },
          data: { paymentMode: dto.paymentMode },
        });
      }

      // Finally update the sales invoice
      await tx.salesInvoice.update({
        where: { id },
        data: updateData,
      });
    });

    return this.findOne(id);
  }
}
