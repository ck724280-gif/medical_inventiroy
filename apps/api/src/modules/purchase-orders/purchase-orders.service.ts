import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generatePoNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${dateStr}-`;

    const count = await this.prisma.purchaseOrder.count({
      where: {
        poNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async create(data: any, userId: string) {
    const poNumber = await this.generatePoNumber();

    let subtotal = 0;
    let taxAmount = 0;

    const itemsData = (data.items || []).map((item: any) => {
      const qty = Number(item.orderedQty || item.qty || 1);
      const rate = Number(item.expectedRate || item.rate || 0);
      const taxPercent = Number(item.taxPercent || 0);
      const itemSubtotal = qty * rate;
      const itemTax = (itemSubtotal * taxPercent) / 100;
      const lineTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      return {
        medicineId: item.medicineId,
        orderedQty: qty,
        receivedQty: 0,
        unitId: item.unitId || null,
        expectedRate: rate,
        taxPercent,
        lineTotal: Number(lineTotal.toFixed(2)),
      };
    });

    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        branchId: data.branchId,
        status: data.status || 'SENT',
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        notes: data.notes || null,
        subtotal: Number(subtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount,
        createdByUserId: userId,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        branch: true,
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
  }

  async findAll(query: {
    status?: string;
    supplierId?: string;
    branchId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          branch: true,
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              medicine: true,
            },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: {
        supplier: true,
        items: { include: { medicine: true } },
      },
    });
  }

  async convertToInwardBill(id: string) {
    const po = await this.findOne(id);

    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Cannot convert a cancelled Purchase Order');
    }

    const defaultItems = po.items.map((item) => {
      const remainingQty = item.orderedQty - item.receivedQty;
      return {
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
        qty: remainingQty > 0 ? remainingQty : item.orderedQty,
        unitId: item.unitId,
        purchasePrice: item.expectedRate,
        mrp: item.medicine.mrp || Number((item.expectedRate * 1.25).toFixed(2)),
        sellingPrice: item.medicine.defaultSellingPrice || Number((item.expectedRate * 1.2).toFixed(2)),
        taxPercent: item.taxPercent || 0,
        discountPercent: 0,
        lineTotal: item.lineTotal,
      };
    });

    return {
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      branchId: po.branchId,
      notes: `Converted from PO #${po.poNumber}${po.notes ? ' | ' + po.notes : ''}`,
      items: defaultItems,
      subtotal: po.subtotal,
      taxAmount: po.taxAmount,
      totalAmount: po.totalAmount,
    };
  }

  async remove(id: string) {
    const po = await this.findOne(id);
    if (po.status === 'FULLY_RECEIVED') {
      throw new BadRequestException('Cannot delete a fully received Purchase Order');
    }
    return this.prisma.purchaseOrder.delete({
      where: { id },
    });
  }
}
