import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategory, PaymentMode, PaperWidth } from '@medical-inventory/shared-types';
import { formatDate, formatDateTime, formatCurrency } from '@medical-inventory/shared-utils';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private parseExpenseNotes(notesStr?: string | null) {
    if (!notesStr) {
      return {
        payeeName: '',
        payeePhone: '',
        utrNumber: '',
        voucherNumber: '',
        taxAmount: 0,
        description: '',
      };
    }

    if (notesStr.startsWith('{') && notesStr.endsWith('}')) {
      try {
        const parsed = JSON.parse(notesStr);
        return {
          payeeName: parsed.payeeName || '',
          payeePhone: parsed.payeePhone || '',
          utrNumber: parsed.utrNumber || '',
          voucherNumber: parsed.voucherNumber || '',
          taxAmount: Number(parsed.taxAmount) || 0,
          description: parsed.description || parsed.notes || '',
        };
      } catch (e) {
        // fallback to plain text
      }
    }

    return {
      payeeName: '',
      payeePhone: '',
      utrNumber: '',
      voucherNumber: '',
      taxAmount: 0,
      description: notesStr,
    };
  }

  private serializeExpenseNotes(data: any): string {
    const meta = {
      payeeName: data.payeeName ? data.payeeName.trim() : '',
      payeePhone: data.payeePhone ? data.payeePhone.trim() : '',
      utrNumber: data.utrNumber ? data.utrNumber.trim() : '',
      voucherNumber: data.voucherNumber ? data.voucherNumber.trim() : '',
      taxAmount: Number(data.taxAmount) || 0,
      description: data.description ? data.description.trim() : (data.notes ? data.notes.trim() : ''),
    };
    return JSON.stringify(meta);
  }

  async findAll(query?: {
    branchId?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 100;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) {
      where.OR = [{ branchId: query.branchId }, { branchId: null }];
    }
    if (query?.category && query.category.trim()) where.category = query.category.trim();
    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query?.startDate) where.date.gte = new Date(query.startDate);
      if (query?.endDate) where.date.lte = new Date(query.endDate);
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { notes: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { paymentMethod: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rawExpenses] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    const formatted = rawExpenses.map((exp) => {
      const meta = this.parseExpenseNotes(exp.notes);
      return {
        ...exp,
        payeeName: meta.payeeName,
        payeePhone: meta.payeePhone,
        utrNumber: meta.utrNumber,
        voucherNumber: meta.voucherNumber,
        taxAmount: meta.taxAmount,
        description: meta.description,
      };
    });

    return {
      data: formatted,
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
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    const meta = this.parseExpenseNotes(expense.notes);
    return {
      ...expense,
      payeeName: meta.payeeName,
      payeePhone: meta.payeePhone,
      utrNumber: meta.utrNumber,
      voucherNumber: meta.voucherNumber,
      taxAmount: meta.taxAmount,
      description: meta.description,
    };
  }

  async getExpenseVoucher(id: string) {
    const expense = await this.findOne(id);
    const business = await this.prisma.businessSettings.findUnique({ where: { id: 'default' } });

    return {
      storeName: business?.name || 'MedCare Pharmacy',
      storeAddress: `${expense.branch?.address || ''}, ${expense.branch?.city || ''} - ${business?.pinZip || ''}`,
      storePhone: expense.branch?.phone || business?.phone || '',
      gstNumber: business?.gstNumber || '',
      voucherNumber: expense.voucherNumber || `VCH-${id.slice(0, 8).toUpperCase()}`,
      date: formatDate(expense.date),
      time: formatDateTime(expense.date).split(' ').slice(1).join(' '),
      category: expense.category,
      paidTo: expense.payeeName || 'Cash / Vendor Payee',
      payeePhone: expense.payeePhone || 'N/A',
      amount: Number(expense.amount || 0),
      paymentMethod: expense.paymentMethod,
      utrNumber: expense.utrNumber || 'N/A',
      description: expense.description || 'Operational Expense Payout',
      loggedBy: `${expense.createdByUser?.firstName || 'Admin'} ${expense.createdByUser?.lastName || ''}`.trim(),
      headerText: 'DEBIT PAYMENT VOUCHER',
      footerText: 'This voucher serves as valid proof of business expenditure and accounts debit.',
    };
  }

  async create(
    data: {
      branchId: string;
      category: ExpenseCategory | string;
      amount: number;
      date?: Date | string;
      paymentMethod?: PaymentMode | string;
      payeeName?: string;
      payeePhone?: string;
      utrNumber?: string;
      voucherNumber?: string;
      taxAmount?: number;
      notes?: string;
      description?: string;
      attachmentPath?: string;
    },
    userId: string
  ) {
    const serializedNotes = this.serializeExpenseNotes(data);

    return this.prisma.expense.create({
      data: {
        branchId: data.branchId,
        category: data.category || 'MISCELLANEOUS',
        amount: Number(data.amount) || 0,
        date: data.date ? new Date(data.date) : new Date(),
        paymentMethod: data.paymentMethod || 'CASH',
        notes: serializedNotes,
        attachmentPath: data.attachmentPath || null,
        createdByUserId: userId,
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    const updatedData: any = {};

    if (data.amount !== undefined) updatedData.amount = Number(data.amount) || 0;
    if (data.category !== undefined) updatedData.category = data.category;
    if (data.paymentMethod !== undefined) updatedData.paymentMethod = data.paymentMethod;
    if (data.date !== undefined) updatedData.date = new Date(data.date);

    // Merge metadata
    const mergedMeta = {
      payeeName: data.payeeName !== undefined ? data.payeeName : existing.payeeName,
      payeePhone: data.payeePhone !== undefined ? data.payeePhone : existing.payeePhone,
      utrNumber: data.utrNumber !== undefined ? data.utrNumber : existing.utrNumber,
      voucherNumber: data.voucherNumber !== undefined ? data.voucherNumber : existing.voucherNumber,
      taxAmount: data.taxAmount !== undefined ? data.taxAmount : existing.taxAmount,
      description:
        data.description !== undefined
          ? data.description
          : data.notes !== undefined
          ? data.notes
          : existing.description,
    };

    updatedData.notes = this.serializeExpenseNotes(mergedMeta);

    await this.prisma.expense.update({
      where: { id },
      data: updatedData,
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.expense.delete({ where: { id } });
  }
}

