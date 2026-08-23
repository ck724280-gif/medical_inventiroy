import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SearchResultItem {
  id: string;
  type: 'medicine' | 'customer' | 'supplier' | 'invoice' | 'batch' | 'nav';
  title: string;
  subtitle: string;
  description?: string;
  badge?: string;
  url?: string;
  score: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  private calculateScore(targetText: string | null | undefined, query: string): number {
    if (!targetText || !query) return 0;
    const text = targetText.toLowerCase();
    const q = query.toLowerCase();

    if (text === q) return 100;
    if (text.startsWith(q)) return 80;
    
    // Check if any word starts with query
    const words = text.split(/[\s\-_\/,\.]+/);
    if (words.some((w) => w.startsWith(q))) return 70;
    
    if (text.includes(q)) return 50;
    return 0;
  }

  async searchUniversal(query: string, branchId?: string, limit = 20): Promise<{
    results: SearchResultItem[];
    counts: Record<string, number>;
  }> {
    const q = (query || '').trim();
    if (!q) {
      return { results: [], counts: {} };
    }

    const itemLimit = Math.min(Math.max(limit, 5), 50);

    // Parallel fetch across core entities
    const [medicines, customers, suppliers, invoices, batches] = await Promise.all([
      // 1. Medicines
      this.prisma.medicine.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { genericName: { contains: q, mode: 'insensitive' } },
            { brandName: { contains: q, mode: 'insensitive' } },
            { composition: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { hsnCode: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: itemLimit,
        include: {
          manufacturer: { select: { name: true } },
          category: { select: { name: true } },
          baseUnit: { select: { name: true, abbreviation: true } },
          batches: {
            where: {
              status: 'ACTIVE',
              currentQty: { gt: 0 },
              ...(branchId ? { branchId } : {}),
            },
            select: { currentQty: true, expiryDate: true, batchNumber: true, sellingPrice: true },
            orderBy: { expiryDate: 'asc' },
          },
        },
      }),

      // 2. Customers
      this.prisma.customer.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { gstNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: itemLimit,
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
          currentBalance: true,
          creditLimit: true,
        },
      }),

      // 3. Suppliers
      this.prisma.supplier.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
            { contactPerson: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { gstNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: itemLimit,
        select: {
          id: true,
          name: true,
          company: true,
          contactPerson: true,
          phone: true,
          currentBalance: true,
          gstNumber: true,
        },
      }),

      // 4. Invoices
      this.prisma.salesInvoice.findMany({
        where: {
          ...(branchId ? { branchId } : {}),
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
            { customer: { mobile: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: itemLimit,
        include: {
          customer: { select: { name: true, mobile: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 5. Batches
      this.prisma.batch.findMany({
        where: {
          status: 'ACTIVE',
          ...(branchId ? { branchId } : {}),
          OR: [
            { batchNumber: { contains: q, mode: 'insensitive' } },
            { medicine: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: itemLimit,
        include: {
          medicine: { select: { id: true, name: true, sku: true } },
          supplier: { select: { name: true } },
        },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    const scoredResults: SearchResultItem[] = [];

    // Map Medicines
    for (const med of medicines) {
      const totalStock = med.batches.reduce((sum, b) => sum + b.currentQty, 0);
      const earliestBatch = med.batches[0];
      const expiryFormatted = earliestBatch
        ? new Date(earliestBatch.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        : null;

      const maxScore = Math.max(
        this.calculateScore(med.name, q),
        this.calculateScore(med.genericName, q) * 0.9,
        this.calculateScore(med.brandName, q) * 0.9,
        this.calculateScore(med.sku, q) * 0.95,
        this.calculateScore(med.barcode, q) * 0.95,
        this.calculateScore(med.composition, q) * 0.8
      );

      scoredResults.push({
        id: med.id,
        type: 'medicine',
        title: med.name,
        subtitle: [
          med.genericName || med.brandName,
          med.manufacturer?.name,
          totalStock > 0 ? `Stock: ${totalStock} ${med.baseUnit?.abbreviation || 'units'}` : 'Out of stock',
          expiryFormatted ? `Exp: ${expiryFormatted}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        description: med.composition || undefined,
        badge: totalStock > 0 ? (totalStock <= med.reorderLevel ? 'Low Stock' : 'In Stock') : 'No Stock',
        url: `/medicines/${med.id}`,
        score: maxScore,
        metadata: {
          medicineId: med.id,
          sku: med.sku,
          barcode: med.barcode,
          mrp: med.mrp,
          sellingPrice: med.defaultSellingPrice,
          totalStock,
          batches: med.batches,
        },
      });
    }

    // Map Customers
    for (const cust of customers) {
      const maxScore = Math.max(
        this.calculateScore(cust.name, q),
        this.calculateScore(cust.mobile, q) * 0.95,
        this.calculateScore(cust.email, q) * 0.8
      );

      scoredResults.push({
        id: cust.id,
        type: 'customer',
        title: cust.name,
        subtitle: [
          cust.mobile ? `📱 ${cust.mobile}` : null,
          cust.email ? `✉️ ${cust.email}` : null,
          `Bal: ₹${(cust.currentBalance || 0).toFixed(2)}`,
        ]
          .filter(Boolean)
          .join(' · '),
        badge: cust.currentBalance > 0 ? 'Due' : undefined,
        url: `/customers/${cust.id}`,
        score: maxScore,
        metadata: cust,
      });
    }

    // Map Suppliers
    for (const supp of suppliers) {
      const maxScore = Math.max(
        this.calculateScore(supp.name, q),
        this.calculateScore(supp.company, q) * 0.9,
        this.calculateScore(supp.contactPerson, q) * 0.85,
        this.calculateScore(supp.phone, q) * 0.95
      );

      scoredResults.push({
        id: supp.id,
        type: 'supplier',
        title: supp.name,
        subtitle: [
          supp.company,
          supp.contactPerson ? `Contact: ${supp.contactPerson}` : null,
          supp.phone ? `📞 ${supp.phone}` : null,
          `Bal: ₹${(supp.currentBalance || 0).toFixed(2)}`,
        ]
          .filter(Boolean)
          .join(' · '),
        url: `/suppliers/${supp.id}`,
        score: maxScore,
        metadata: supp,
      });
    }

    // Map Invoices
    for (const inv of invoices) {
      const maxScore = Math.max(
        this.calculateScore(inv.invoiceNumber, q),
        this.calculateScore(inv.customer?.name, q) * 0.85,
        this.calculateScore(inv.customer?.mobile, q) * 0.85
      );

      scoredResults.push({
        id: inv.id,
        type: 'invoice',
        title: inv.invoiceNumber,
        subtitle: [
          inv.customer?.name ? `Customer: ${inv.customer.name}` : 'Walk-in Customer',
          inv.customer?.mobile ? `(${inv.customer.mobile})` : null,
          `Total: ₹${(inv.totalAmount || 0).toFixed(2)}`,
          new Date(inv.createdAt).toLocaleDateString('en-GB'),
        ]
          .filter(Boolean)
          .join(' · '),
        badge: inv.paymentStatus,
        url: `/sales/${inv.id}`,
        score: maxScore,
        metadata: inv,
      });
    }

    // Map Batches
    for (const batch of batches) {
      const maxScore = Math.max(
        this.calculateScore(batch.batchNumber, q),
        this.calculateScore(batch.medicine?.name, q) * 0.9,
        this.calculateScore(batch.medicine?.sku, q) * 0.85
      );

      scoredResults.push({
        id: batch.id,
        type: 'batch',
        title: `Batch: ${batch.batchNumber}`,
        subtitle: [
          batch.medicine?.name,
          `Qty: ${batch.currentQty}`,
          `Exp: ${new Date(batch.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}`,
          batch.supplier?.name ? `Supplier: ${batch.supplier.name}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        badge: batch.status,
        url: `/inventory/${batch.id}`,
        score: maxScore,
        metadata: batch,
      });
    }

    // Sort by highest score descending
    scoredResults.sort((a, b) => b.score - a.score);

    const limitedResults = scoredResults.slice(0, itemLimit);

    const counts: Record<string, number> = {
      total: scoredResults.length,
      medicine: medicines.length,
      customer: customers.length,
      supplier: suppliers.length,
      invoice: invoices.length,
      batch: batches.length,
    };

    return {
      results: limitedResults,
      counts,
    };
  }

  async searchMedicines(query: string, branchId?: string, limit = 20) {
    const q = (query || '').trim();
    if (!q) return [];

    const medicines = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { genericName: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
          { composition: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { hsnCode: { contains: q, mode: 'insensitive' } },
          { barcodes: { some: { barcodeValue: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      take: limit,
      include: {
        category: true,
        manufacturer: true,
        baseUnit: true,
        units: { include: { fromUnit: true, toUnit: true } },
        batches: {
          where: {
            status: 'ACTIVE',
            currentQty: { gt: 0 },
            ...(branchId ? { branchId } : {}),
          },
          orderBy: { expiryDate: 'asc' }, // FEFO first
        },
      },
    });

    return medicines
      .map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.currentQty, 0);
        const score = Math.max(
          this.calculateScore(med.name, q),
          this.calculateScore(med.genericName, q) * 0.9,
          this.calculateScore(med.brandName, q) * 0.9,
          this.calculateScore(med.sku, q) * 0.95,
          this.calculateScore(med.barcode, q) * 0.95
        );

        return {
          ...med,
          totalStock,
          isLowStock: totalStock <= med.reorderLevel,
          isOutOfStock: totalStock === 0,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async searchCustomers(query: string, limit = 20) {
    const q = (query || '').trim();
    if (!q) return [];

    const customers = await this.prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { mobile: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { gstNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        _count: { select: { sales: true } },
      },
    });

    return customers
      .map((cust) => {
        const score = Math.max(
          this.calculateScore(cust.name, q),
          this.calculateScore(cust.mobile, q) * 0.95,
          this.calculateScore(cust.email, q) * 0.8
        );
        return { ...cust, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  async searchSuppliers(query: string, limit = 20) {
    const q = (query || '').trim();
    if (!q) return [];

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { contactPerson: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { gstNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        _count: { select: { purchases: true } },
      },
    });

    return suppliers
      .map((supp) => {
        const score = Math.max(
          this.calculateScore(supp.name, q),
          this.calculateScore(supp.company, q) * 0.9,
          this.calculateScore(supp.phone, q) * 0.95
        );
        return { ...supp, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  async searchInvoices(query: string, branchId?: string, limit = 20) {
    const q = (query || '').trim();
    if (!q) return [];

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
          { customer: { mobile: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: limit,
      include: {
        customer: true,
        createdByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices
      .map((inv) => {
        const score = Math.max(
          this.calculateScore(inv.invoiceNumber, q),
          this.calculateScore(inv.customer?.name, q) * 0.85,
          this.calculateScore(inv.customer?.mobile, q) * 0.85
        );
        return { ...inv, score };
      })
      .sort((a, b) => b.score - a.score);
  }
}
