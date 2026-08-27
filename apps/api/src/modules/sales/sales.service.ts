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

  private async resolveBranchId(branchId?: string): Promise<string | undefined> {
    if (!branchId || branchId === 'all' || branchId === 'ALL') return undefined;
    const branch = await this.prisma.branch.findFirst({
      where: {
        OR: [{ id: branchId }, { code: branchId }],
      },
      select: { id: true },
    });
    return branch?.id || branchId;
  }

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

    const resolvedBranchId = await this.resolveBranchId(query?.branchId);
    const andConditions: any[] = [];

    if (resolvedBranchId) {
      andConditions.push({ branchId: resolvedBranchId });
    }

    if (query?.customerId) {
      andConditions.push({ customerId: query.customerId });
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      andConditions.push({
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
          { customer: { mobile: { contains: q, mode: 'insensitive' } } },
          { patientName: { contains: q, mode: 'insensitive' } },
          { doctorName: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

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

  async findByInvoiceNumber(invoiceNumber: string, branchId?: string) {
    if (!invoiceNumber || !invoiceNumber.trim()) {
      throw new BadRequestException('Invoice number is required');
    }

    const trimmed = invoiceNumber.trim();
    const resolvedBranchId = branchId ? await this.resolveBranchId(branchId) : undefined;

    const where: any = {
      OR: [
        { invoiceNumber: { equals: trimmed, mode: 'insensitive' } },
        { id: trimmed },
      ],
    };

    if (resolvedBranchId) {
      where.branchId = resolvedBranchId;
    }

    const sale = await this.prisma.salesInvoice.findFirst({
      where,
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
      throw new NotFoundException(`Sales invoice #${trimmed} not found`);
    }

    return sale;
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

        // Apply Round-off (Default: floor / round down to whole rupee as requested: 33.67 -> 33.00, 33.34 -> 33.00)
        let roundOff = 0;
        if (dto.roundOffAmount !== undefined && dto.roundOffAmount !== null) {
          roundOff = roundToDecimals(dto.roundOffAmount);
        } else if (dto.roundOffMode === 'nearest') {
          roundOff = roundToDecimals(Math.round(grandTotal) - grandTotal);
        } else if (dto.roundOffMode === 'none') {
          roundOff = 0;
        } else {
          roundOff = roundToDecimals(Math.floor(grandTotal) - grandTotal);
        }
        grandTotal = Math.max(0, roundToDecimals(grandTotal + roundOff));

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
        items: { include: { batch: true, medicine: true } },
        payments: true,
        prescriptionRecord: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sales invoice with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.invoiceNumber !== undefined && dto.invoiceNumber.trim()) {
      updateData.invoiceNumber = dto.invoiceNumber.trim();
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.createdAt !== undefined) updateData.createdAt = new Date(dto.createdAt);
    if (dto.paymentStatus !== undefined) updateData.paymentStatus = dto.paymentStatus;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId || null;

    return this.prisma.$transaction(async (tx) => {
      let grandTotal = Number(sale.totalAmount);
      let subtotal = Number(sale.subtotal);
      let discountAmount = Number(sale.discountAmount);
      let taxAmount = Number(sale.taxAmount);

      // 1. If items are being updated by Super Admin
      if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
        // Restore old batch stocks
        for (const oldItem of sale.items) {
          if (oldItem.batchId) {
            await tx.batch.update({
              where: { id: oldItem.batchId },
              data: { currentQty: { increment: oldItem.qty } },
            }).catch(() => {});
          }
        }

        // Delete old sales items
        await tx.salesItem.deleteMany({
          where: { salesInvoiceId: id },
        });

        // Recalculate totals and insert new sales items
        subtotal = 0;
        discountAmount = 0;
        taxAmount = 0;
        grandTotal = 0;

        for (const item of dto.items) {
          const qty = Number(item.qty || 1);
          const rate = Number(item.rate || item.unitPrice || 0);
          const mrp = Number(item.mrp || rate);
          const discPercent = Number(item.discountPercent || 0);
          const taxPercent = Number(item.taxPercent || 0);

          const itemSubtotal = qty * rate;
          const discVal = (itemSubtotal * discPercent) / 100;
          const taxable = itemSubtotal - discVal;
          const itemTax = (taxable * taxPercent) / 100;
          const lineTotal = taxable + itemTax;

          subtotal += itemSubtotal;
          discountAmount += discVal;
          taxAmount += itemTax;
          grandTotal += lineTotal;

          await tx.salesItem.create({
            data: {
              salesInvoiceId: id,
              medicineId: item.medicineId,
              batchId: item.batchId,
              qty,
              unitId: item.unitId || null,
              rate,
              mrp,
              discountPercent: discPercent,
              taxPercent,
              hsnCode: item.hsnCode || null,
              taxableAmount: taxable,
              cgstAmount: itemTax / 2,
              sgstAmount: itemTax / 2,
              igstAmount: 0,
              originalPrice: mrp,
              lineTotal,
            },
          });

          // Deduct new batch stock
          if (item.batchId) {
            await tx.batch.update({
              where: { id: item.batchId },
              data: { currentQty: { decrement: qty } },
            }).catch(() => {});
          }
        }

        updateData.subtotal = subtotal;
        updateData.discountAmount = discountAmount;
        updateData.taxAmount = taxAmount;
        updateData.totalAmount = grandTotal;
      }

      // 2. Prescription / Patient / Doctor update
      if (dto.patientName !== undefined || dto.doctorName !== undefined) {
        if (sale.prescriptionRecord) {
          await tx.prescriptionRecord.update({
            where: { id: sale.prescriptionRecord.id },
            data: {
              patientName: dto.patientName !== undefined ? dto.patientName : sale.prescriptionRecord.patientName,
              doctorName: dto.doctorName !== undefined ? dto.doctorName : sale.prescriptionRecord.doctorName,
            },
          });
        } else if (dto.patientName || dto.doctorName) {
          await tx.prescriptionRecord.create({
            data: {
              salesInvoice: { connect: { id } },
              patientName: dto.patientName || 'Patient',
              doctorName: dto.doctorName || 'Dr. Self / Store',
              doctorRegNo: 'DOC-REG-001',
              patientAge: 30,
              drugSchedule: 'SCHEDULE_H',
            },
          });
        }
      }

      // 3. Payments and Paid Amount adjustment
      if (dto.paidAmount !== undefined) {
        const newPaidAmount = Number(dto.paidAmount);
        const paymentMode = dto.paymentMode || sale.payments?.[0]?.paymentMode || 'CASH';

        // Replace payment records with updated amount
        await tx.salesPayment.deleteMany({
          where: { salesInvoiceId: id },
        });

        if (newPaidAmount > 0) {
          await tx.salesPayment.create({
            data: {
              salesInvoice: { connect: { id } },
              amount: newPaidAmount,
              paymentMode,
              referenceNumber: 'ADMIN-EDIT-ADJUST',
              createdByUserId: sale.payments?.[0]?.createdByUserId || 'system',
            },
          });
        }

        // Auto determine payment status
        if (newPaidAmount >= grandTotal && grandTotal > 0) {
          updateData.paymentStatus = 'PAID';
        } else if (newPaidAmount > 0) {
          updateData.paymentStatus = 'PARTIAL';
        } else {
          updateData.paymentStatus = 'UNPAID';
        }
      } else if (dto.paymentMode !== undefined) {
        await tx.salesPayment.updateMany({
          where: { salesInvoiceId: id },
          data: { paymentMode: dto.paymentMode },
        });
      }

      // 4. Customer ledger balance adjustment
      if (dto.customerId !== undefined && dto.customerId !== sale.customerId) {
        const totalPaid = dto.paidAmount !== undefined
          ? Number(dto.paidAmount)
          : sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const unpaidAmount = grandTotal - totalPaid;

        if (unpaidAmount > 0) {
          if (sale.customerId) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: { currentBalance: { decrement: unpaidAmount } },
            }).catch(() => {});
          }
          if (dto.customerId) {
            await tx.customer.update({
              where: { id: dto.customerId },
              data: { currentBalance: { increment: unpaidAmount } },
            }).catch(() => {});
          }
        }
      }

      // 5. Update sales invoice record
      await tx.salesInvoice.update({
        where: { id },
        data: updateData,
      });
    });

    return this.findOne(id);
  }

  async getPdfReceiptHtml(id: string): Promise<string> {
    const receipt = await this.getReceiptData(id);
    const paidAmount = receipt.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, Number(receipt.grandTotal) - paidAmount);

    const itemsRows = receipt.items
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #ccc; font-weight: bold;">${item.name}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #ccc; font-family: monospace; font-size: 11px;">${item.batch}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #ccc; font-family: monospace; font-size: 11px;">${item.expiry}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #ccc; text-align: center;">${item.qty} ${item.unit}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #ccc; text-align: right;">₹${Number(item.rate).toFixed(2)}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold;">₹${Number(item.amount).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Invoice #${receipt.invoiceNumber}</title>
        <style>
          @page { size: auto; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 15px; }
          .receipt-box { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px; }
          .header h1 { font-size: 20px; color: #0284c7; margin: 0 0 4px 0; }
          .header p { margin: 2px 0; font-size: 11px; color: #475569; }
          .meta-grid { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { text-align: left; background: #f1f5f9; padding: 6px 4px; font-size: 10.5px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          .totals-table { width: 260px; margin-left: auto; font-size: 12px; }
          .totals-table td { padding: 3px 0; }
          .grand-total { font-size: 14px; font-weight: bold; color: #0f172a; border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; padding: 6px 0 !important; }
          .footer { text-align: center; margin-top: 20px; font-size: 10.5px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-paid { background: #dcfce7; color: #166534; }
          .badge-due { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <h1>${receipt.storeName}</h1>
            <p>${receipt.address}</p>
            <p><strong>Phone:</strong> ${receipt.phone} ${receipt.email ? '| <strong>Email:</strong> ' + receipt.email : ''}</p>
            <p><strong>GSTIN:</strong> ${receipt.gstNumber || 'N/A'} | <strong>DL No:</strong> ${receipt.pharmacyLicense || 'N/A'}</p>
          </div>

          <div class="meta-grid">
            <div>
              <p style="margin: 2px 0;"><strong>Invoice #:</strong> <span style="font-family: monospace; color: #0284c7;">${receipt.invoiceNumber}</span></p>
              <p style="margin: 2px 0;"><strong>Date:</strong> ${receipt.date} ${receipt.time}</p>
              <p style="margin: 2px 0;"><strong>Cashier:</strong> ${receipt.cashierName}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 2px 0;"><strong>Customer:</strong> ${receipt.customerName}</p>
              ${receipt.customerMobile ? `<p style="margin: 2px 0;"><strong>Mobile:</strong> ${receipt.customerMobile}</p>` : ''}
              <p style="margin: 2px 0;"><strong>Status:</strong> <span class="badge ${balanceDue === 0 ? 'badge-paid' : 'badge-due'}">${balanceDue === 0 ? 'PAID' : 'PARTIAL / DUE'}</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Medicine / Item</th>
                <th>Batch</th>
                <th>Exp</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right; font-family: monospace;">₹${Number(receipt.subtotal).toFixed(2)}</td>
            </tr>
            ${Number(receipt.discountTotal) > 0 ? `<tr><td>Discount:</td><td style="text-align: right; color: #dc2626; font-family: monospace;">-₹${Number(receipt.discountTotal).toFixed(2)}</td></tr>` : ''}
            <tr>
              <td>GST Tax:</td>
              <td style="text-align: right; font-family: monospace;">₹${Number(receipt.taxTotal).toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td>Total Amount:</td>
              <td style="text-align: right; font-family: monospace;">₹${Number(receipt.grandTotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Amount Paid:</td>
              <td style="text-align: right; color: #16a34a; font-family: monospace; font-weight: bold;">₹${paidAmount.toFixed(2)}</td>
            </tr>
            ${balanceDue > 0 ? `<tr style="color: #dc2626; font-weight: bold;"><td>Balance Due:</td><td style="text-align: right; font-family: monospace;">₹${balanceDue.toFixed(2)}</td></tr>` : ''}
          </table>

          <div class="footer">
            <p style="font-weight: bold; margin: 2px 0;">${receipt.thankYouMessage}</p>
            <p style="margin: 2px 0;">${receipt.returnPolicy}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  }
}
