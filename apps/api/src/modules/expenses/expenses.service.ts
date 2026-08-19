import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategory, PaymentMode } from '@medical-inventory/shared-types';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    branchId?: string;
    category?: ExpenseCategory;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.category) where.category = query.category;
    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query?.startDate) where.date.gte = new Date(query.startDate);
      if (query?.endDate) where.date.lte = new Date(query.endDate);
    }

    const [total, expenses] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      data: expenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        branch: true,
        createdByUser: { select: { firstName: true, lastName: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async create(
    data: {
      branchId: string;
      category: ExpenseCategory;
      amount: number;
      date?: Date | string;
      paymentMethod?: PaymentMode;
      notes?: string;
      attachmentPath?: string;
    },
    userId: string
  ) {
    return this.prisma.expense.create({
      data: {
        branchId: data.branchId,
        category: data.category,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        paymentMethod: data.paymentMethod || PaymentMode.CASH,
        notes: data.notes || null,
        attachmentPath: data.attachmentPath || null,
        createdByUserId: userId,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.expense.delete({ where: { id } });
  }
}
