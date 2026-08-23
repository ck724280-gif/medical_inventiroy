import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerCreditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a credit entry when invoice is on credit (§49) */
  async createCreditEntry(
    customerId: string,
    branchId: string,
    invoiceId: string,
    creditAmount: number,
    userId: string,
  ) {
    const entry = await this.prisma.customerCredit.create({
      data: {
        customerId,
        branchId,
        invoiceId,
        creditAmount,
        paidAmount: 0,
        outstandingAmount: creditAmount,
      },
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CUSTOMER_CREDIT_CREATED',
        entity: 'CustomerCredit',
        entityId: entry.id,
        newValue: JSON.stringify({ customerId, branchId, creditAmount }),
      },
    });

    return entry;
  }

  /** Record payment against a credit entry (§49) */
  async recordPayment(
    creditId: string,
    paidAmount: number,
    paymentMethod: string,
    collectedBy: string,
    reference?: string,
    notes?: string,
  ) {
    const credit = await this.prisma.customerCredit.findUnique({ where: { id: creditId } });
    if (!credit) throw new NotFoundException('Credit entry not found.');
    if (paidAmount <= 0) throw new BadRequestException('Payment amount must be greater than 0.');
    if (paidAmount > credit.outstandingAmount) {
      throw new BadRequestException(
        `Payment (${paidAmount}) exceeds outstanding amount (${credit.outstandingAmount}).`,
      );
    }

    const newPaid = credit.paidAmount + paidAmount;
    const newOutstanding = credit.creditAmount - newPaid;

    const updated = await this.prisma.customerCredit.update({
      where: { id: creditId },
      data: {
        paidAmount: newPaid,
        outstandingAmount: Math.max(0, newOutstanding),
        paymentDate: new Date(),
        paymentMethod,
        collectedBy,
        reference,
        notes,
      },
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId: collectedBy,
        action: 'CUSTOMER_CREDIT_PAYMENT',
        entity: 'CustomerCredit',
        entityId: creditId,
        newValue: JSON.stringify({ paidAmount, paymentMethod, outstandingAmount: newOutstanding }),
      },
    });

    return updated;
  }

  /** Branch-wise outstanding credits (§49) */
  async getBranchOutstanding(branchId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { branchId, outstandingAmount: { gt: 0 } };

    const [total, items] = await Promise.all([
      this.prisma.customerCredit.count({ where }),
      this.prisma.customerCredit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        },
      }),
    ]);

    const totalOutstanding = await this.prisma.customerCredit.aggregate({
      where,
      _sum: { outstandingAmount: true },
    });

    return {
      total,
      page,
      limit,
      totalOutstandingAmount: totalOutstanding._sum.outstandingAmount || 0,
      items,
    };
  }

  /** Customer-wise outstanding (§49) */
  async getCustomerOutstanding(customerId: string, branchId?: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found.');

    const where: any = { customerId, outstandingAmount: { gt: 0 } };
    if (branchId) where.branchId = branchId;

    const credits = await this.prisma.customerCredit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
      },
    });

    const totalOutstanding = credits.reduce((sum, c) => sum + c.outstandingAmount, 0);

    return { customer, totalOutstanding, credits };
  }

  /** Organization-wide outstanding (Super Admin only) (§49) */
  async getOrgWideOutstanding(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { outstandingAmount: { gt: 0 } };

    const [total, items] = await Promise.all([
      this.prisma.customerCredit.count({ where }),
      this.prisma.customerCredit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { outstandingAmount: 'desc' },
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          branch: { select: { id: true, name: true, code: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
    ]);

    const totalAgg = await this.prisma.customerCredit.aggregate({
      where,
      _sum: { outstandingAmount: true },
    });

    return {
      total,
      page,
      limit,
      totalOutstandingAmount: totalAgg._sum.outstandingAmount || 0,
      items,
    };
  }

  /** Payment history for a customer (§49) */
  async getPaymentHistory(customerId: string, branchId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { customerId };
    if (branchId) where.branchId = branchId;

    const [total, items] = await Promise.all([
      this.prisma.customerCredit.count({ where }),
      this.prisma.customerCredit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }
}
