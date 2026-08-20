import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. AI Assistant will operate in fallback mode.'
      );
    }
  }

  /**
   * Main chat interface with function calling & context grounding
   */
  async processChat(
    message: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  ): Promise<{ response: string; toolsUsed?: string[] }> {
    if (!message || message.trim() === '') {
      return { response: 'Kripya apna sawal puchein (Please ask a question).' };
    }

    const toolsUsed: string[] = [];

    // Pre-fetch relevant live data based on question intent to provide fast, reliable grounded context
    const contextData = await this.gatherContextForQuery(message, toolsUsed);

    const systemInstruction = `
You are the "MedCare AI Pharmacy Co-pilot & Business Advisor" built specifically for the Super Administrator / Business Owner of MedCare Pharmacy & Healthcare ERP.

Your Role & Responsibilities:
1. Provide accurate, real-time insights about Inventory, Stock valuation, Sales Revenue, Net Profit & Loss, Expiring Medicines, Supplier Ledgers, and Customer Credit.
2. Provide clear, step-by-step guidance on how to use any ERP feature (e.g. POS billing, changing thermal printer roll size, adding multiple cashiers, managing store branches, setting up Google Drive backups).
3. Always format currency in Indian Rupees (₹) with proper comma separators (e.g., ₹1,45,000.00).
4. Communicate professionally, courteously, and clearly. You can reply in Hindi, Hinglish, or English based on the language the user asked in.
5. Use clean Markdown tables, bullet points, and bold text for numbers and medicine names to make answers easy to read.

Current Live ERP Database Context:
${JSON.stringify(contextData, null, 2)}
`;

    if (!this.genAI) {
      return {
        response: this.generateFallbackResponse(message, contextData),
        toolsUsed,
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        systemInstruction,
      });

      // Format previous history for Gemini API
      const formattedContents: any[] = [];

      for (const h of history.slice(-6)) {
        formattedContents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.parts?.[0]?.text || '' }],
        });
      }

      // Add current user prompt
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const result = await model.generateContent({
        contents: formattedContents,
      });

      const responseText = result.response.text();
      return {
        response: responseText,
        toolsUsed,
      };
    } catch (error: any) {
      this.logger.error(`Gemini API error: ${error.message}`, error.stack);
      // Fallback to grounded local calculation if API call fails
      return {
        response: this.generateFallbackResponse(message, contextData),
        toolsUsed,
      };
    }
  }

  /**
   * Automatically gathers live database context based on user inquiry
   */
  private async gatherContextForQuery(query: string, toolsUsed: string[]) {
    const q = query.toLowerCase();
    const context: any = {};

    // 1. Inventory & Stock Valuation
    if (
      q.includes('stock') ||
      q.includes('inventory') ||
      q.includes('valuation') ||
      q.includes('paracetamol') ||
      q.includes('dolo') ||
      q.includes('medicine') ||
      q.includes('dawa') ||
      q.includes('quantity') ||
      q.includes('batao')
    ) {
      toolsUsed.push('getInventorySummary');
      context.inventorySummary = await this.getInventorySummary();

      // If specific medicine query
      const words = query.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        if (
          !['kitna', 'stock', 'hai', 'kya', 'dawa', 'batao', 'aaj', 'the', 'and', 'for'].includes(
            word.toLowerCase()
          )
        ) {
          const searchRes = await this.searchMedicineStock(word);
          if (searchRes.length > 0) {
            toolsUsed.push(`searchMedicineStock("${word}")`);
            context.medicineSearchResults = searchRes;
            break;
          }
        }
      }
    }

    // 2. Sales, Revenue, Profit & Loss
    if (
      q.includes('sale') ||
      q.includes('profit') ||
      q.includes('loss') ||
      q.includes('kamai') ||
      q.includes('revenue') ||
      q.includes('aaj') ||
      q.includes('today') ||
      q.includes('month') ||
      q.includes('income') ||
      q.includes('margin')
    ) {
      toolsUsed.push('getSalesReport');
      context.salesAndProfit = await this.getSalesReport();
    }

    // 3. Expiry Tracking & Near Expiry
    if (
      q.includes('expir') ||
      q.includes('khatam') ||
      q.includes('date') ||
      q.includes('fefo') ||
      q.includes('warning')
    ) {
      toolsUsed.push('getExpiringMedicines');
      context.expiringMedicines = await this.getExpiringMedicines(60);
    }

    // 4. Top Selling Items
    if (
      q.includes('top') ||
      q.includes('highest') ||
      q.includes('popular') ||
      q.includes('demand') ||
      q.includes('best')
    ) {
      toolsUsed.push('getTopSellingMedicines');
      context.topSellingMedicines = await this.getTopSellingMedicines(5);
    }

    // 5. Suppliers & Financial Ledgers
    if (
      q.includes('supplier') ||
      q.includes('customer') ||
      q.includes('ledger') ||
      q.includes('udhari') ||
      q.includes('payment') ||
      q.includes('expense') ||
      q.includes('kharch') ||
      q.includes('balance') ||
      q.includes('baki')
    ) {
      toolsUsed.push('getFinancialLedgerSummary');
      context.financialLedger = await this.getFinancialLedgerSummary();
    }

    // 6. ERP How-to Guide
    if (
      q.includes('kaise') ||
      q.includes('how') ||
      q.includes('karna') ||
      q.includes('print') ||
      q.includes('thermal') ||
      q.includes('backup') ||
      q.includes('branch') ||
      q.includes('cashier') ||
      q.includes('add') ||
      q.includes('pos') ||
      q.includes('bill') ||
      q.includes('sale') ||
      q.includes('purchase') ||
      q.includes('inward') ||
      q.includes('return') ||
      q.includes('report') ||
      q.includes('guide') ||
      q.includes('function') ||
      q.includes('kaam')
    ) {
      toolsUsed.push('getErpGuide');
      context.erpGuide = this.getErpGuide(query);
    }

    // Default: If no specific trigger matched, provide high-level overview
    if (Object.keys(context).length === 0) {
      toolsUsed.push('getInventorySummary', 'getSalesReport');
      context.inventorySummary = await this.getInventorySummary();
      context.salesAndProfit = await this.getSalesReport();
      context.expiringMedicines = await this.getExpiringMedicines(30);
    }

    return context;
  }

  /**
   * Live Tool: Inventory Summary
   */
  async getInventorySummary() {
    const [totalMedicines, batches] = await Promise.all([
      this.prisma.medicine.count({ where: { isActive: true } }),
      this.prisma.batch.findMany({
        where: { currentQty: { gt: 0 } },
        select: {
          currentQty: true,
          purchasePrice: true,
          mrp: true,
          sellingPrice: true,
        },
      }),
    ]);

    let totalStockUnits = 0;
    let totalPurchaseValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;

    for (const b of batches) {
      totalStockUnits += b.currentQty;
      if (b.currentQty <= 10) lowStockCount++;
      totalPurchaseValuation += b.currentQty * Number(b.purchasePrice || 0);
      totalRetailValuation += b.currentQty * Number(b.sellingPrice || b.mrp || 0);
    }

    return {
      totalActiveMedicines: totalMedicines,
      totalUnitsInStock: totalStockUnits,
      lowStockBatchesCount: lowStockCount,
      estimatedPurchaseValuation: `₹${totalPurchaseValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      estimatedRetailValuation: `₹${totalRetailValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      potentialGrossMargin: `₹${(totalRetailValuation - totalPurchaseValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    };
  }

  /**
   * Live Tool: Search Specific Medicine Stock
   */
  async searchMedicineStock(name: string) {
    const medicines = await this.prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { genericName: { contains: name, mode: 'insensitive' } },
          { brandName: { contains: name, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        batches: {
          where: { currentQty: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      take: 5,
    });

    return medicines.map((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);
      return {
        name: m.name,
        genericName: m.genericName,
        category: m.category?.name || 'General',
        currentTotalStock: totalStock,
        dosageForm: m.dosageForm,
        batches: m.batches.map((b) => ({
          batchNumber: b.batchNumber,
          stock: b.currentQty,
          expiryDate: b.expiryDate.toISOString().split('T')[0],
          purchasePrice: `₹${b.purchasePrice}`,
          sellingPrice: `₹${b.sellingPrice}`,
          mrp: `₹${b.mrp}`,
        })),
      };
    });
  }

  /**
   * Live Tool: Sales, Revenue & Net Profit Calculation
   */
  async getSalesReport() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySales, allSales] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { createdAt: { gte: today } },
        include: {
          items: {
            include: {
              batch: true,
            },
          },
          payments: true,
        },
      }),
      this.prisma.salesInvoice.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              batch: true,
            },
          },
          payments: true,
        },
      }),
    ]);

    const calculateMetrics = (salesList: any[]) => {
      let totalRevenue = 0;
      let totalCostOfGoods = 0;
      let totalDiscount = 0;
      let cashSales = 0;
      let upiSales = 0;
      let cardSales = 0;

      for (const s of salesList) {
        totalRevenue += Number(s.totalAmount || 0);
        totalDiscount += Number(s.discountAmount || 0);

        for (const p of s.payments || []) {
          if (p.paymentMode === 'CASH') cashSales += Number(p.amount || 0);
          else if (p.paymentMode === 'UPI') upiSales += Number(p.amount || 0);
          else if (p.paymentMode === 'CARD') cardSales += Number(p.amount || 0);
        }

        for (const item of s.items || []) {
          const unitCost = Number(item.batch?.purchasePrice || 0);
          totalCostOfGoods += (item.qty || 0) * unitCost;
        }
      }

      const grossProfit = totalRevenue - totalCostOfGoods;
      const profitMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

      return {
        invoiceCount: salesList.length,
        totalRevenue: `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        costOfGoodsSold: `₹${totalCostOfGoods.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        grossProfit: `₹${grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        profitMargin: `${profitMarginPct}%`,
        discountGiven: `₹${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        paymentSplit: {
          cash: `₹${cashSales.toLocaleString('en-IN')}`,
          upi: `₹${upiSales.toLocaleString('en-IN')}`,
          card: `₹${cardSales.toLocaleString('en-IN')}`,
        },
      };
    };

    return {
      today: calculateMetrics(todaySales),
      recentOverall: calculateMetrics(allSales),
    };
  }

  /**
   * Live Tool: Expiring Medicines (FEFO)
   */
  async getExpiringMedicines(days = 60) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const expiringBatches = await this.prisma.batch.findMany({
      where: {
        currentQty: { gt: 0 },
        expiryDate: { lte: futureDate },
      },
      include: {
        medicine: true,
      },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    return expiringBatches.map((b) => {
      const daysLeft = Math.ceil(
        (b.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        medicineName: b.medicine.name,
        batchNumber: b.batchNumber,
        quantityRemaining: b.currentQty,
        expiryDate: b.expiryDate.toISOString().split('T')[0],
        daysRemaining: daysLeft <= 0 ? 'ALREADY EXPIRED' : `${daysLeft} days left`,
        riskValuation: `₹${(b.currentQty * Number(b.purchasePrice || 0)).toLocaleString('en-IN')}`,
      };
    });
  }

  /**
   * Live Tool: Top Selling Medicines
   */
  async getTopSellingMedicines(limit = 5) {
    const saleItems = await this.prisma.salesItem.groupBy({
      by: ['medicineId'],
      _sum: {
        qty: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          qty: 'desc',
        },
      },
      take: limit,
    });

    const medicineIds = saleItems.map((si) => si.medicineId);
    const medicines = await this.prisma.medicine.findMany({
      where: { id: { in: medicineIds } },
    });

    const medMap = new Map(medicines.map((m) => [m.id, m.name]));

    return saleItems.map((si) => ({
      medicineName: medMap.get(si.medicineId) || 'Unknown Medicine',
      unitsSold: si._sum.qty || 0,
      totalRevenueGenerated: `₹${Number(si._sum.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    }));
  }

  /**
   * Live Tool: Financial Ledgers, Payables & Receivables
   */
  async getFinancialLedgerSummary() {
    const [suppliers, customers, expenses] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { isActive: true },
        select: { name: true, currentBalance: true, creditLimit: true },
      }),
      this.prisma.customer.findMany({
        where: { isActive: true },
        select: { name: true, currentBalance: true, creditLimit: true },
      }),
      this.prisma.expense.findMany({
        take: 50,
        orderBy: { date: 'desc' },
      }),
    ]);

    const totalSupplierPayables = suppliers.reduce(
      (acc, s) => acc + Number(s.currentBalance || 0),
      0
    );
    const totalCustomerReceivables = customers.reduce(
      (acc, c) => acc + Number(c.currentBalance || 0),
      0
    );
    const totalExpenses = expenses.reduce(
      (acc, e) => acc + Number(e.amount || 0),
      0
    );

    return {
      totalDistributorPayables: `₹${totalSupplierPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      totalCustomerReceivables: `₹${totalCustomerReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      recentExpensesLogged: `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      topCreditors: suppliers
        .filter((s) => Number(s.currentBalance) > 0)
        .slice(0, 5)
        .map((s) => ({
          supplierName: s.name,
          balanceOwed: `₹${Number(s.currentBalance).toLocaleString('en-IN')}`,
        })),
    };
  }

  /**
   * ERP How-to Knowledge Guide
   */
  getErpGuide(query: string) {
    const q = query.toLowerCase();
    if (q.includes('thermal') || q.includes('receipt') || q.includes('print')) {
      return {
        topic: 'Thermal & Invoice Printing Setup',
        instructions: [
          'Go to Settings > Thermal Receipt Setup.',
          'Choose your printer roll format: 80mm Standard POS, 58mm Mini Roll, A4 Full Page, or A5 Half Page Invoice.',
          'Customize Pharmacy Header, GSTIN, Drug License Number, and Terms & Conditions.',
          'Click Save Settings. POS checkout will instantly use your selected format with live preview.',
        ],
      };
    }
    if (q.includes('branch') || q.includes('cashier') || q.includes('staff')) {
      return {
        topic: 'Branch & Staff Management',
        instructions: [
          'Go to Settings > Branch Staff & Roles.',
          'Click "+ Add New Staff Person" button.',
          'Enter Name, Email, Password, assign Role (e.g. Billing Cashier, Pharmacist, Store Manager), and select Store Branch.',
          'Multiple cashiers can be added under the same branch for multi-counter billing.',
        ],
      };
    }
    if (q.includes('backup') || q.includes('drive')) {
      return {
        topic: 'Database Backup & Google Drive Cloud Sync',
        instructions: [
          'Go to Settings > Database Backup & Google Drive.',
          'Click "Create Manual Backup" to immediately generate a compressed database snapshot.',
          'Set your desired Backup Retention Period (1 to 7 Days max). Old backups will automatically be purged.',
          'Optionally paste your Google Cloud Service Account JSON key to enable automatic daily Google Drive cloud sync.',
        ],
      };
    }
    if (
      q.includes('pos') ||
      q.includes('bill') ||
      q.includes('sale') ||
      q.includes('counter') ||
      q.includes('checkout') ||
      q.includes('discount')
    ) {
      return {
        topic: 'POS Billing, Barcode Scanning & Checkout',
        instructions: [
          'Go to the POS Counter page.',
          'Use a USB Barcode Scanner to scan medicine pack barcode, or search by Brand/Generic Name in the search box.',
          'The system automatically loads the earliest expiring batch using FEFO (First-Expiry-First-Out) rule to avoid stock wastage.',
          'You can add items, apply item-level discounts, change quantity, and select custom batches.',
          'During checkout, choose the Payment Method (Cash, UPI, Card, or Credit/Outstanding for registered customers).',
          'Click "Generate Bill & Print Receipt" to print the thermal slip and automatically deduct inventory stock.',
        ],
      };
    }
    if (
      q.includes('purchase') ||
      q.includes('inward') ||
      q.includes('distributor') ||
      q.includes('label') ||
      q.includes('cost')
    ) {
      return {
        topic: 'Purchase Bills Inward & Barcode Label Generation',
        instructions: [
          'Go to Purchases > Invoices & Inward Stock.',
          'Click "New Purchase Inward (Stock In)" button.',
          'Select the Supplier Agency, enter Supplier Invoice Number (blank for auto-generate), and add medicine line items.',
          'For each medicine, enter its unique Batch Number, Expiry Date, Quantity, Purchase Price, and MRP.',
          'Click "Confirm & Update Stock" to instantly add batches into inventory and record the supplier outstanding balance.',
          'After confirming, click the "Labels" button to preview and print 40x20mm thermal barcode shelf labels for the received medicines.',
        ],
      };
    }
    if (q.includes('return') || q.includes('customer return') || q.includes('supplier return')) {
      return {
        topic: 'Sales Returns & Purchase Returns Reconciliations',
        instructions: [
          'For Patients (Sales Returns): Go to Sales > Sales Invoices, search the original bill, click "Return Items", select returned quantity (restricted to total sold), and confirm. Restocked quantity is automatically added back to the original batch.',
          'For Suppliers (Purchase Returns): Go to Purchases > Return to Supplier, select the supplier, specify the expired or damaged batch, enter returned quantity, and click "Process Return". The supplier payable ledger is automatically adjusted.',
        ],
      };
    }
    if (
      q.includes('report') ||
      q.includes('gst') ||
      q.includes('excel') ||
      q.includes('pdf') ||
      q.includes('profit') ||
      q.includes('tax')
    ) {
      return {
        topic: 'Business Reports & Excel/PDF Exports',
        instructions: [
          'Go to the Reports page.',
          'Select your desired report from the tabs: Sales Register, GSTR-1 Tax Summary, Profit & Loss Statement, or Purchase Book.',
          'Choose the Date Range (Today, Last 7 Days, Month, or Custom dates) and select a Branch if needed.',
          'Click "Export to Excel" or "Download PDF" to get accounting-ready clean document downloads.',
        ],
      };
    }
    return {
      topic: 'General ERP Operations Guide',
      instructions: [
        'POS Counter: Fast billing with barcode scanner support, FEFO batch selection, and multiple payment methods.',
        'Purchases: Inward bills entry with automatic batch creation and supplier ledger updates.',
        'Inventory: Real-time stock audit, batch expiry alerts, and 40x20mm barcode label generation.',
        'Reports: Daily sales, GST summary, profit/loss statement, and fast Excel/PDF exports.',
      ],
    };
  }

  /**
   * Local grounded fallback generator in case API key is offline
   */
  private generateFallbackResponse(query: string, context: any): string {
    const q = query.toLowerCase();

    if (q.includes('profit') || q.includes('sale') || q.includes('kamai')) {
      const s = context.salesAndProfit?.today;
      return `### 📊 **Today's Sales & Profit Summary**\n\n- **Invoices Generated:** ${s?.invoiceCount || 0}\n- **Total Revenue:** **${s?.totalRevenue || '₹0.00'}**\n- **Cost of Goods (COGS):** ${s?.costOfGoodsSold || '₹0.00'}\n- **Net Gross Profit:** **${s?.grossProfit || '₹0.00'}** (Margin: **${s?.profitMargin || '0%'}**)\n- **Payment Breakdown:** Cash: ${s?.paymentSplit?.cash || '₹0'}, UPI: ${s?.paymentSplit?.upi || '₹0'}, Card: ${s?.paymentSplit?.card || '₹0'}`;
    }

    if (q.includes('stock') || q.includes('inventory') || q.includes('valuation')) {
      const inv = context.inventorySummary;
      return `### 📦 **Inventory & Stock Valuation Overview**\n\n- **Active Medicines:** ${inv?.totalActiveMedicines || 0}\n- **Total Stock Quantity:** ${inv?.totalUnitsInStock || 0} Units\n- **Purchase Stock Valuation:** **${inv?.estimatedPurchaseValuation || '₹0.00'}**\n- **Retail Value (MRP/Sale):** **${inv?.estimatedRetailValuation || '₹0.00'}**\n- **Potential Gross Profit:** **${inv?.potentialGrossMargin || '₹0.00'}**\n- **Low Stock Items:** ${inv?.lowStockBatchesCount || 0} batches have 10 or fewer units remaining.`;
    }

    if (q.includes('expir')) {
      const list = context.expiringMedicines || [];
      if (list.length === 0) {
        return `✅ **Good News!** No medicines are expiring in the next 60 days.`;
      }
      let res = `### ⚠️ **Expiring Medicines Alert (Next 60 Days)**\n\n| Medicine | Batch | Stock | Expiry | Days Left |\n|---|---|---|---|---|\n`;
      for (const item of list) {
        res += `| **${item.medicineName}** | \`${item.batchNumber}\` | ${item.quantityRemaining} | ${item.expiryDate} | ${item.daysRemaining} |\n`;
      }
      return res;
    }

    return `Hello Super Admin! Main aapka **MedCare AI Assistant** hoon.\n\nAap mujhse live store ka koi bhi data pooch sakte hain, jaise:\n- *"Aaj ki total sales aur profit kitna hua?"*\n- *"Paracetamol ya Dolo ka kitna stock bacha hai?"*\n- *"Kon-kon si medicines agle 30 din me expire hone wali hain?"*\n- *"Supplier ka kitna payment baki hai?"*\n- *"Thermal receipt ka layout kaise change karein?"*`;
  }
}
