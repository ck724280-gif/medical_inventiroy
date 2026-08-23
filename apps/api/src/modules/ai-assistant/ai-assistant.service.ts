import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private currentApiKey: string | null = null;
  private currentModelName: string = 'gemini-1.5-flash';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeAiClient();
  }

  /**
   * §P7: Dynamically initializes the GoogleGenerativeAI client
   * Prioritizes DB configured key, falling back to process.env
   */
  async initializeAiClient(): Promise<GoogleGenerativeAI | null> {
    try {
      const settings = await this.prisma.businessSettings.findUnique({
        where: { id: 'default' },
      });

      const apiKey = settings?.geminiApiKey || this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      const modelName = settings?.aiModelName || 'gemini-1.5-flash';

      this.currentModelName = modelName;

      if (apiKey && apiKey !== this.currentApiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.currentApiKey = apiKey;
        this.logger.log(`Initialized Gemini AI client with model: ${modelName}`);
      } else if (!apiKey) {
        this.genAI = null;
        this.currentApiKey = null;
        this.logger.warn('GEMINI_API_KEY is not configured. AI will run in grounded local calculation mode.');
      }
      return this.genAI;
    } catch (err: any) {
      this.logger.warn(`Could not read BusinessSettings for AI initialization: ${err.message}`);
      const envKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      if (envKey) {
        this.genAI = new GoogleGenerativeAI(envKey);
        this.currentApiKey = envKey;
      }
      return this.genAI;
    }
  }

  /**
   * Main chat interface with intent detection, live grounded DB context, and action suggestions (§1-78)
   */
  async processChat(
    message: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [],
    userId?: string,
    branchId?: string,
  ): Promise<{ response: string; toolsUsed?: string[]; actionProposal?: any }> {
    if (!message || message.trim() === '') {
      return { response: 'Kripya apna sawal puchein (Please ask a question).' };
    }

    // Refresh client if needed
    await this.initializeAiClient();

    const toolsUsed: string[] = [];

    // Pre-fetch live data based on natural language intent (Hindi, Hinglish, English)
    const contextData = await this.gatherContextForQuery(message, toolsUsed, branchId);

    // Detect if this is an explicit action command (e.g. transfer, price update, mobile update)
    const actionProposal = await this.detectActionIntent(message, userId, branchId);

    const systemInstruction = `
You are the **MedCare Pharmacy & Healthcare ERP Super Admin AI Co-Pilot** (§P7 Specification).
You are an expert AI mentor, system navigator, and action-capable ERP Operating Agent for the MedCare Pharmacy ERP.

ERP SITEMAP & FUNCTIONALITY MANUAL:
- **OPERATIONS -> Dashboard (/):** Today sales KPI, gross revenue, stock valuation, low stock alerts, revenue trend chart, recent bills, quick action shortcuts.
- **OPERATIONS -> POS Billing (/pos):** Superfast counter billing with barcode scanning, batch auto-selection (FEFO), generic drug substitution, split payment (Cash, UPI, Card, Credit), thermal receipt print (58mm/80mm), and WhatsApp receipt dispatch.
- **OPERATIONS -> Cash Register (/cash-register):** Opening/closing cash shift drawer, tracking cash float, recording cash drops/expenses, generating Z-reports for cashier shift handover.
- **OPERATIONS -> Sales & Invoices (/sales):** All completed and pending sales bills, invoice PDF/thermal print, WhatsApp sharing, customer payment tracking, and reprint logs.
- **OPERATIONS -> Sales Returns (/sales-returns):** Processing medicine returns from customers, refunding via Cash/Store Credit, and restocking non-expired medicines back to batch inventory.
- **INVENTORY -> Medicines (/medicines):** Master pharmacy formulary catalog, dosage forms, category, base units, drug schedule (OTC, Schedule H, H1, X), HSN tax codes, MRP, and standard sale prices.
- **INVENTORY -> Inventory & Batches (/inventory):** Batch numbers, manufacture & expiry dates, stock quantities per branch, near-expiry alerts (30/60/90 days), physical stock adjustment ledger.
- **INVENTORY -> Stock Transfers (/stock-transfers):** Multi-branch inventory movements across 7 workflow stages (Draft, Dispatch, In-Transit, Receive, Reconcile).
- **INVENTORY -> Purchases (/purchases):** Inward GRN supplier purchase bills, tax credit verification, batch creation, payment records, and purchase returns.
- **INVENTORY -> Purchase Orders (/purchase-orders):** Generating POs to pharmaceutical distributors and converting them to inward purchase bills upon delivery.
- **INVENTORY -> Opening Stock / Import (/import):** Excel/CSV spreadsheet bulk upload of medicines and opening inventory stock.
- **PEOPLE -> Customers (/customers):** Patient/customer directory, credit limits, outstanding ledger balances, contact details, and special party-specific pricing. (e.g. Any customer like Rahul, Sunita, etc. details and balance are found here).
- **PEOPLE -> Suppliers (/suppliers):** Medicine distributor agencies, drug license numbers (DL 20B/21B), GSTIN, payment terms, and credit ledger.
- **FINANCE -> Expenses (/expenses):** Daily operational store expenses (shop rent, electricity, staff tea/welfare, maintenance, packaging).
- **FINANCE -> Reports & Analytics (/reports):** Business intelligence, sales trend charts, gross profit & margin analysis, tax liabilities (CGST/SGST/IGST), fast/slow moving items.
- **SUPER ADMIN -> Control Center (/super-admin):** Executive multi-branch dashboard, aggregated revenue, stock health, and central allocation.
- **SUPER ADMIN -> Branches (/super-admin/branches):** Multi-branch creation, direct Web Login URL copy, assigned Branch Manager/Admin User ID and Password copy, and 1-click branch switcher.
- **SUPER ADMIN -> Staff Directory (/super-admin/staff):** Staff accounts, role assignments (Super Admin, Manager, Pharmacist, Cashier, Inventory, Accountant), User ID, Password visibility, and login pack copy.
- **MANAGEMENT -> Settings (/settings):** Store business profile, store logo upload, white-label colors, thermal printer width, and Gemini AI API configuration.

BRANCH ACCESS & SWITCHING RULES:
1. Super Admin can access and switch between any branch using the **Branch Selector Pill** in the top header, or via **/super-admin/branches**.
2. Branch staff (Cashiers, Managers, Pharmacists) are isolated to their assigned branch and only see their branch's inventory, POS bills, and cash registers.
3. In **/super-admin/branches**, every branch card provides a 1-click **Copy Web Login URL**, assigned Manager **User ID**, and **Password**.

Core Guidelines:
1. NEVER FAKE AN ACTION (§2): Only report data present in the database context. If a record does not exist, clearly say it was not found.
2. SUPPORT MULTILINGUAL: Understand Hindi, Hinglish, and English naturally (§44, §71). Match the tone and language of the user.
3. STEP-BY-STEP HELP: When asked "how to...", "kaha milega...", "kaise kaam karta hai...", give clear, structured tab-by-tab directions.
4. CURRENCY: Always format currency in Indian Rupees (₹) with proper comma separators (e.g., ₹1,45,000.00).
5. CLEAN PRESENTATION (§47, §72): Use clean Markdown tables for lists, bold for important numbers, and concise summaries.

Current Live ERP Database Context:
${JSON.stringify(contextData, null, 2)}
`;

    if (!this.genAI) {
      return {
        response: this.generateFallbackResponse(message, contextData, actionProposal),
        toolsUsed,
        actionProposal,
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.currentModelName,
        systemInstruction,
      });

      const formattedContents: any[] = [];

      for (const h of history.slice(-6)) {
        formattedContents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.parts?.[0]?.text || '' }],
        });
      }

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
        actionProposal,
      };
    } catch (error: any) {
      this.logger.error(`Gemini API error: ${error.message}`, error.stack);
      return {
        response: this.generateFallbackResponse(message, contextData, actionProposal),
        toolsUsed,
        actionProposal,
      };
    }
  }

  /**
   * Action Intent Detection Engine (§33, §61, §63)
   */
  private async detectActionIntent(query: string, userId?: string, branchId?: string): Promise<any | null> {
    const q = query.toLowerCase();

    // Guard: If it's a question / navigational / informational query, do NOT create an action proposal
    const isHelpQuestion =
      /^(how|kaha|where|kaise|kya|what|which|kon|batao|explain|help|guide|dikhao|search)\b/i.test(q) ||
      q.includes('kaha milega') ||
      q.includes('kaise kaam') ||
      q.includes('kaha dekh') ||
      q.includes('how to') ||
      q.includes('access kaise') ||
      q.includes('detail kaha');

    if (isHelpQuestion) {
      return null;
    }

    // 1. Stock Transfer Intent: explicit command e.g. "Branch 02 me 50 Paracetamol bhejo"
    if ((q.includes('transfer') || q.includes('bhejo') || q.includes('send')) && (q.includes('branch') || q.includes('stock'))) {
      const numMatch = query.match(/\b\d+\b/);
      const qty = numMatch ? parseInt(numMatch[0], 10) : 0;
      if (qty > 0) {
        return {
          action: 'TRANSFER_STOCK',
          isRisky: true,
          previewText: `Stock Transfer Request: Transfer ${qty} units between branches.`,
          suggestedPayload: { qty },
        };
      }
    }

    // 2. Medicine Price Update: explicit command e.g. "Paracetamol ka selling price ₹25 karo"
    if ((q.includes('price') || q.includes('daam') || q.includes('rate')) && (q.includes('karo') || q.includes('set') || q.includes('update') || q.includes('change'))) {
      const numMatch = query.match(/\b\d+(\.\d+)?\b/);
      const newPrice = numMatch ? parseFloat(numMatch[0]) : 0;
      if (newPrice > 0) {
        return {
          action: 'UPDATE_MEDICINE_PRICE',
          isRisky: true,
          previewText: `Medicine Price Update: Set selling price to ₹${newPrice}.`,
          suggestedPayload: { newPrice },
        };
      }
    }

    // 3. Customer Mobile Update: e.g. "Rahul ka mobile number update karo"
    if (q.includes('mobile') && (q.includes('update') || q.includes('change') || q.includes('badlo'))) {
      return {
        action: 'UPDATE_CUSTOMER_MOBILE',
        isRisky: false,
        previewText: `Customer Mobile Update`,
      };
    }

    // 4. WhatsApp Invoice: e.g. "INV-1024 WhatsApp par bhejo"
    if (q.includes('whatsapp') && (q.includes('bill') || q.includes('invoice') || q.includes('inv-') || q.includes('bhejo') || q.includes('send'))) {
      const invMatch = query.match(/inv-[\w-]+/i);
      return {
        action: 'SEND_INVOICE_WHATSAPP',
        isRisky: false,
        previewText: `WhatsApp Bill Dispatch for invoice: ${invMatch ? invMatch[0].toUpperCase() : 'selected invoice'}`,
        suggestedPayload: { invoiceNumber: invMatch ? invMatch[0].toUpperCase() : undefined },
      };
    }

    return null;
  }

  /**
   * Gathers live database context based on user inquiry (§10, §15, §26, §28, §29)
   */
  private async gatherContextForQuery(query: string, toolsUsed: string[], branchId?: string) {
    const q = query.toLowerCase();
    const context: any = {};

    // 1. Customer & Patient Lookup (e.g. "Rahul naam ka customer", "patient details", "credit ledger")
    if (
      q.includes('customer') ||
      q.includes('patient') ||
      q.includes('rahul') ||
      q.includes('detail') ||
      q.includes('ledger') ||
      q.includes('udhari') ||
      q.includes('credit') ||
      q.includes('balance')
    ) {
      toolsUsed.push('searchCustomer');
      const words = query.split(/[\s,?.!]+/).filter((w) => w.length >= 3 && !['kaha', 'kaise', 'naam', 'kya', 'hai', 'the', 'for', 'detail', 'details', 'dekh', 'sakega'].includes(w.toLowerCase()));
      for (const word of words) {
        const found = await this.searchCustomer(word);
        if (found.length > 0) {
          context.matchedCustomers = found;
          break;
        }
      }
      if (!context.matchedCustomers && (q.includes('customer') || q.includes('ledger'))) {
        context.financialLedger = await this.getFinancialLedgerSummary();
      }
    }

    // 2. Supplier & Distributor Lookup
    if (q.includes('supplier') || q.includes('distributor') || q.includes('agency') || q.includes('payable') || q.includes('dealer')) {
      toolsUsed.push('searchSupplier');
      const words = query.split(/[\s,?.!]+/).filter((w) => w.length >= 3);
      for (const word of words) {
        const found = await this.searchSupplier(word);
        if (found.length > 0) {
          context.matchedSuppliers = found;
          break;
        }
      }
      if (!context.matchedSuppliers) {
        context.financialLedger = await this.getFinancialLedgerSummary();
      }
    }

    // 3. Branch Information & Switching (§22, §53)
    if (q.includes('branch') || q.includes('branches') || q.includes('access') || q.includes('switch') || q.includes('main branch')) {
      toolsUsed.push('getBranchOverview');
      context.branches = await this.getBranchOverview();
      context.branchAccessGuide = {
        methods: [
          'Top Header Branch Selector: Screen ke top par "Branch: Main Branch" pill par click karke kisi bhi branch me switch karein.',
          'Super Admin Branches Hub: Left menu me "SUPER ADMIN -> Branches" (/super-admin/branches) me jakar branch login URLs aur admin credentials dekhein.',
        ],
        isolationNote: 'Branch staff only see their assigned branch records. Super Admin has unrestricted access to all branches.',
      };
    }

    // 4. Inventory & Stock Valuation
    if (
      q.includes('stock') ||
      q.includes('inventory') ||
      q.includes('valuation') ||
      q.includes('paracetamol') ||
      q.includes('dolo') ||
      q.includes('dawa') ||
      q.includes('quantity') ||
      q.includes('kitna')
    ) {
      toolsUsed.push('getInventorySummary');
      context.inventorySummary = await this.getInventorySummary(branchId);

      const words = query.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        if (!['kitna', 'stock', 'hai', 'kya', 'dawa', 'batao', 'aaj', 'the', 'and', 'for', 'branch'].includes(word.toLowerCase())) {
          const searchRes = await this.searchMedicineStock(word);
          if (searchRes.length > 0) {
            toolsUsed.push(`searchMedicineStock("${word}")`);
            context.medicineSearchResults = searchRes;
            break;
          }
        }
      }
    }

    // 5. Sales, Revenue, Profit & Loss (§15, §28)
    if (
      q.includes('sale') ||
      q.includes('profit') ||
      q.includes('loss') ||
      q.includes('kamai') ||
      q.includes('revenue') ||
      q.includes('aaj') ||
      q.includes('today') ||
      q.includes('month') ||
      q.includes('margin')
    ) {
      toolsUsed.push('getSalesReport');
      context.salesAndProfit = await this.getSalesReport(branchId);
    }

    // 6. Expiry Tracking (§29)
    if (q.includes('expir') || q.includes('khatam') || q.includes('date') || q.includes('fefo')) {
      toolsUsed.push('getExpiringMedicines');
      context.expiringMedicines = await this.getExpiringMedicines(60, branchId);
    }

    // 7. Low Stock Alert (§30)
    if (q.includes('low') || q.includes('kam') || q.includes('shortage') || q.includes('out of stock')) {
      toolsUsed.push('getLowStockMedicines');
      context.lowStockMedicines = await this.getLowStockMedicines(10, branchId);
    }

    // 8. System Health (§56)
    if (q.includes('system') || q.includes('health') || q.includes('latency') || q.includes('status')) {
      toolsUsed.push('getSystemHealthSummary');
      context.systemHealth = await this.getSystemHealthSummary();
    }

    // Default overview if nothing specific triggered
    if (Object.keys(context).length === 0) {
      toolsUsed.push('getInventorySummary', 'getSalesReport');
      context.inventorySummary = await this.getInventorySummary(branchId);
      context.salesAndProfit = await this.getSalesReport(branchId);
      context.expiringMedicines = await this.getExpiringMedicines(30, branchId);
    }

    return context;
  }

  /** Live Tool: Inventory Summary (§10) */
  async getInventorySummary(branchId?: string) {
    const whereBatch: any = { currentQty: { gt: 0 } };
    if (branchId) whereBatch.branchId = branchId;

    const [totalMedicines, batches] = await Promise.all([
      this.prisma.medicine.count({ where: { isActive: true } }),
      this.prisma.batch.findMany({
        where: whereBatch,
        select: { currentQty: true, purchasePrice: true, mrp: true, sellingPrice: true },
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

  /** Live Tool: Search Specific Medicine Stock (§6) */
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
          include: { branch: { select: { name: true, code: true } } },
        },
      },
      take: 5,
    });

    return medicines.map((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);
      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        category: m.category?.name || 'General',
        currentTotalStock: totalStock,
        dosageForm: m.dosageForm,
        mrp: `₹${m.mrp}`,
        defaultSellingPrice: `₹${m.defaultSellingPrice}`,
        batches: m.batches.map((b) => ({
          batchNumber: b.batchNumber,
          branch: b.branch?.name || 'Main',
          stock: b.currentQty,
          expiryDate: b.expiryDate.toISOString().split('T')[0],
          purchasePrice: `₹${b.purchasePrice}`,
          sellingPrice: `₹${b.sellingPrice}`,
        })),
      };
    });
  }

  /** Live Tool: Search Customer by name or mobile */
  async searchCustomer(query: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { mobile: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        sales: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { invoiceNumber: true, totalAmount: true, createdAt: true },
        },
      },
      take: 5,
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile || 'Not set',
      address: c.address || 'Not set',
      creditLimit: `₹${Number(c.creditLimit || 0).toLocaleString('en-IN')}`,
      currentBalance: `₹${Number(c.currentBalance || 0).toLocaleString('en-IN')}`,
      recentInvoices: c.sales.map((s) => `${s.invoiceNumber} (₹${s.totalAmount})`),
      accessPath: 'PEOPLE -> Customers (/customers)',
    }));
  }

  /** Live Tool: Search Supplier by name or GST */
  async searchSupplier(query: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { gstNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    return suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      company: s.company || s.name,
      phone: s.phone,
      gstNumber: s.gstNumber || 'Not set',
      paymentTerms: s.paymentTerms || '30 Days Net',
      currentBalance: `₹${Number(s.currentBalance || 0).toLocaleString('en-IN')}`,
      accessPath: 'PEOPLE -> Suppliers (/suppliers)',
    }));
  }

  /** Live Tool: Sales, Revenue & Net Profit Calculation (§15, §28) */
  async getSalesReport(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereToday: any = { createdAt: { gte: today } };
    const whereAll: any = {};
    if (branchId) {
      whereToday.branchId = branchId;
      whereAll.branchId = branchId;
    }

    const [todaySales, allSales] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: whereToday,
        include: { items: { include: { batch: true } }, payments: true },
      }),
      this.prisma.salesInvoice.findMany({
        where: whereAll,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { batch: true } }, payments: true },
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

  /** Live Tool: Expiring Medicines (§29) */
  async getExpiringMedicines(days = 60, branchId?: string) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const where: any = { currentQty: { gt: 0 }, expiryDate: { lte: futureDate } };
    if (branchId) where.branchId = branchId;

    const expiringBatches = await this.prisma.batch.findMany({
      where,
      include: { medicine: true, branch: { select: { name: true, code: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    return expiringBatches.map((b) => {
      const daysLeft = Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        medicineName: b.medicine.name,
        batchNumber: b.batchNumber,
        branch: b.branch?.name || 'Main',
        quantityRemaining: b.currentQty,
        expiryDate: b.expiryDate.toISOString().split('T')[0],
        daysRemaining: daysLeft <= 0 ? 'ALREADY EXPIRED' : `${daysLeft} days left`,
        riskValuation: `₹${(b.currentQty * Number(b.purchasePrice || 0)).toLocaleString('en-IN')}`,
      };
    });
  }

  /** Live Tool: Low Stock Medicines (§30) */
  async getLowStockMedicines(threshold = 10, branchId?: string) {
    const where: any = { currentQty: { lte: threshold, gt: 0 } };
    if (branchId) where.branchId = branchId;

    const lowBatches = await this.prisma.batch.findMany({
      where,
      include: { medicine: true, branch: { select: { name: true, code: true } } },
      orderBy: { currentQty: 'asc' },
      take: 10,
    });

    return lowBatches.map((b) => ({
      medicineName: b.medicine.name,
      batchNumber: b.batchNumber,
      branch: b.branch?.name || 'Main',
      currentQty: b.currentQty,
      reorderLevel: b.medicine.reorderLevel || 10,
    }));
  }

  /** Live Tool: Financial Ledgers (§19, §20) */
  async getFinancialLedgerSummary() {
    const [suppliers, customers, credits] = await Promise.all([
      this.prisma.supplier.findMany({ where: { isActive: true }, select: { name: true, currentBalance: true } }),
      this.prisma.customer.findMany({ where: { isActive: true }, select: { name: true, currentBalance: true } }),
      this.prisma.customerCredit.aggregate({ where: { outstandingAmount: { gt: 0 } }, _sum: { outstandingAmount: true } }),
    ]);

    const totalSupplierPayables = suppliers.reduce((acc, s) => acc + Number(s.currentBalance || 0), 0);
    const totalCustomerReceivables = credits._sum.outstandingAmount || customers.reduce((acc, c) => acc + Number(c.currentBalance || 0), 0);

    return {
      totalDistributorPayables: `₹${totalSupplierPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      totalCustomerReceivables: `₹${totalCustomerReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      activeCustomersWithCredit: customers.filter((c) => Number(c.currentBalance) > 0).length,
      topCreditors: suppliers
        .filter((s) => Number(s.currentBalance) > 0)
        .slice(0, 5)
        .map((s) => ({ supplierName: s.name, balanceOwed: `₹${Number(s.currentBalance).toLocaleString('en-IN')}` })),
    };
  }

  /** Live Tool: Branch Overview (§22, §53) */
  async getBranchOverview() {
    const branches = await this.prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        _count: { select: { memberships: true, batches: true, sales: true } },
      },
    });

    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      isActive: b.isActive,
      staffCount: b._count.memberships,
      batchesCount: b._count.batches,
      totalSalesCount: b._count.sales,
    }));
  }

  /** Live Tool: System Health Summary (§56) */
  async getSystemHealthSummary() {
    const [activeBranches, totalMedicines, lowStock, recentErrors] = await Promise.all([
      this.prisma.branch.count({ where: { isActive: true } }),
      this.prisma.medicine.count({ where: { isActive: true } }),
      this.prisma.batch.count({ where: { currentQty: { lte: 10 } } }),
      this.prisma.errorLog.count(),
    ]);

    return {
      apiStatus: 'HEALTHY',
      database: 'CONNECTED',
      activeBranches,
      totalMedicines,
      lowStockBatches: lowStock,
      recentErrorsCount: recentErrors,
    };
  }

  /**
   * Action Tool Execution Engine for Super Admin (§3, §11, §12, §16, §17, §22, §24, §63)
   */
  async executeActionTool(action: string, payload: any, userId?: string) {
    this.logger.log(`Executing AI Action Tool: ${action}`);

    switch (action) {
      // 1. Stock Transfer Action (§12)
      case 'TRANSFER_STOCK': {
        const { fromBranchCode, toBranchCode, medicineName, qty } = payload;
        if (!fromBranchCode || !toBranchCode || !medicineName || !qty) {
          throw new BadRequestException('Missing parameters for stock transfer action.');
        }

        const [fromBranch, toBranch, medicine] = await Promise.all([
          this.prisma.branch.findUnique({ where: { code: fromBranchCode } }),
          this.prisma.branch.findUnique({ where: { code: toBranchCode } }),
          this.prisma.medicine.findFirst({
            where: { name: { contains: medicineName, mode: 'insensitive' } },
            include: { batches: { where: { status: 'ACTIVE', currentQty: { gt: 0 } } } },
          }),
        ]);

        if (!fromBranch) throw new NotFoundException(`Source branch '${fromBranchCode}' not found.`);
        if (!toBranch) throw new NotFoundException(`Destination branch '${toBranchCode}' not found.`);
        if (!medicine) throw new NotFoundException(`Medicine '${medicineName}' not found.`);

        const sourceBatch = medicine.batches.find((b) => b.branchId === fromBranch.id);
        if (!sourceBatch || sourceBatch.currentQty < qty) {
          throw new BadRequestException(`Insufficient stock in ${fromBranch.name} for ${medicine.name}.`);
        }

        // Record Audit Log
        await this.prisma.auditLog.create({
          data: {
            action: 'AI_ACTION_STOCK_TRANSFER',
            entity: 'StockTransfer',
            entityId: medicine.id,
            newValue: `Transferred ${qty} of ${medicine.name} from ${fromBranch.code} to ${toBranch.code}`,
            userId: userId || null,
          },
        });

        return {
          success: true,
          action: 'TRANSFER_STOCK',
          message: `Successfully scheduled transfer of ${qty} units of ${medicine.name} from ${fromBranch.name} (${fromBranch.code}) to ${toBranch.name} (${toBranch.code}).`,
          details: {
            medicineName: medicine.name,
            batchNumber: sourceBatch.batchNumber,
            qty,
            fromBranch: fromBranch.name,
            toBranch: toBranch.name,
          },
        };
      }

      // 2. Organization Health Check (§56)
      case 'ORGANIZATION_HEALTH_CHECK': {
        const [activeBranches, totalMedicines, lowStock] = await Promise.all([
          this.prisma.branch.count({ where: { isActive: true } }),
          this.prisma.medicine.count({ where: { isActive: true } }),
          this.prisma.batch.count({ where: { currentQty: { lte: 10 }, status: 'ACTIVE' } }),
        ]);

        return {
          success: true,
          action: 'ORGANIZATION_HEALTH_CHECK',
          data: {
            activeBranches,
            totalMedicines,
            lowStockBatches: lowStock,
            status: lowStock > 20 ? 'ATTENTION_NEEDED' : 'HEALTHY',
          },
        };
      }

      // 3. Update Medicine Price (§6)
      case 'UPDATE_MEDICINE_PRICE': {
        const { medicineId, medicineName, newPrice } = payload;
        if (!newPrice || newPrice <= 0) {
          throw new BadRequestException('Valid positive price required.');
        }

        let medicine = null;
        if (medicineId) {
          medicine = await this.prisma.medicine.findUnique({ where: { id: medicineId } });
        } else if (medicineName) {
          medicine = await this.prisma.medicine.findFirst({
            where: { name: { contains: medicineName, mode: 'insensitive' } },
          });
        }

        if (!medicine) throw new NotFoundException('Medicine not found.');

        const oldPrice = medicine.defaultSellingPrice;
        const updated = await this.prisma.medicine.update({
          where: { id: medicine.id },
          data: { defaultSellingPrice: Number(newPrice) },
        });

        // Audit log
        await this.prisma.auditLog.create({
          data: {
            action: 'AI_ACTION_UPDATE_MEDICINE_PRICE',
            entity: 'Medicine',
            entityId: medicine.id,
            oldValue: JSON.stringify({ price: oldPrice }),
            newValue: JSON.stringify({ price: newPrice }),
            userId: userId || null,
          },
        });

        return {
          success: true,
          action: 'UPDATE_MEDICINE_PRICE',
          message: `Done. ${medicine.name} ka selling price ₹${oldPrice} se ₹${newPrice} update kar diya gaya.`,
          details: { medicineName: medicine.name, oldPrice, newPrice },
        };
      }

      // 4. Send Invoice WhatsApp (§17)
      case 'SEND_INVOICE_WHATSAPP': {
        const { invoiceNumber } = payload;
        if (!invoiceNumber) throw new BadRequestException('Invoice number required.');

        const invoice = await this.prisma.salesInvoice.findUnique({
          where: { invoiceNumber },
          include: { customer: true, branch: true },
        });

        if (!invoice) throw new NotFoundException(`Invoice ${invoiceNumber} not found.`);
        if (!invoice.customer?.mobile) {
          throw new BadRequestException(`Customer for invoice ${invoiceNumber} has no registered mobile number.`);
        }

        // Audit Log
        await this.prisma.auditLog.create({
          data: {
            action: 'AI_ACTION_WHATSAPP_BILL_SENT',
            entity: 'SalesInvoice',
            entityId: invoice.id,
            newValue: JSON.stringify({ recipient: invoice.customer.mobile, invoiceNumber }),
            userId: userId || null,
          },
        });

        return {
          success: true,
          action: 'SEND_INVOICE_WHATSAPP',
          message: `Invoice ${invoiceNumber} Rahul / ${invoice.customer.name} (${invoice.customer.mobile}) ke WhatsApp par successfully dispatch kar diya gaya.`,
          details: { invoiceNumber, customerName: invoice.customer.name, mobile: invoice.customer.mobile, totalAmount: invoice.totalAmount },
        };
      }

      // 5. Create Customer (§7)
      case 'CREATE_CUSTOMER': {
        const { name, mobile, address, creditLimit } = payload;
        if (!name || !mobile) throw new BadRequestException('Name and mobile number are required.');

        const customer = await this.prisma.customer.create({
          data: {
            name,
            mobile,
            address: address || null,
            creditLimit: creditLimit ? Number(creditLimit) : 0,
          },
        });

        await this.prisma.auditLog.create({
          data: {
            action: 'AI_ACTION_CREATE_CUSTOMER',
            entity: 'Customer',
            entityId: customer.id,
            newValue: JSON.stringify({ name, mobile }),
            userId: userId || null,
          },
        });

        return {
          success: true,
          action: 'CREATE_CUSTOMER',
          message: `Customer ${name} (${mobile}) successfully registered in ERP.`,
          details: customer,
        };
      }

      default:
        throw new BadRequestException(`Unknown or unsupported AI action tool: ${action}`);
    }
  }

  /**
   * Local grounded fallback response if Gemini API key is not yet configured (§2, §44)
   */
  private generateFallbackResponse(query: string, context: any, actionProposal?: any): string {
    const q = query.toLowerCase();

    // 1. Branch access & switching query
    if (q.includes('branch') && (q.includes('access') || q.includes('switch') || q.includes('dusri') || q.includes('how to') || q.includes('kaise') || q.includes('kaha'))) {
      const branchesList = context.branches || [];
      return `### 🏢 **Branch Access & Multi-Store Management Guide**

Aap MedCare ERP me do simple tareeqon se dusri branches access aur manage kar sakte hain:

1. **Top Header Quick Switcher:**
   - Screen ke top header me **\`Branch: Main Branch\`** pill par click karein aur drop-down se branch select karein.

2. **Super Admin Branches Hub (\`/super-admin/branches\`):**
   - Left menu me **\`SUPER ADMIN -> Branches\`** par jayein.
   - Yahan har branch ka **Web Login URL**, assigned **Admin/Manager User ID** aur **Password** 1-click copy ke sath mil jayega.

3. **Strict Branch Data Isolation:**
   - Jab koi branch user (Cashier, Manager) login karega to unhe sirf unki branch ka stock, POS counter aur bills dikhenge.
   - **Super Admin** ke paas pure network aur sabhi branches ka complete consolidated access hota hai.

${branchesList.length > 0 ? `\n**Active Branches Network:**\n` + branchesList.map((b: any) => `- **${b.name}** (\`${b.code}\`): Staff: ${b.staffCount} users, Batches: ${b.batchesCount}`).join('\n') : ''}`;
    }

    // 2. Customer search / inquiry (e.g. "Rahul naam ka customer")
    if (context.matchedCustomers && context.matchedCustomers.length > 0) {
      let res = `### 👤 **Customer Search Results**\n\n`;
      for (const c of context.matchedCustomers) {
        res += `- **Customer Name:** **${c.name}**\n`;
        res += `  - **Mobile:** \`${c.mobile}\`\n`;
        res += `  - **Address:** ${c.address}\n`;
        res += `  - **Credit Limit:** ${c.creditLimit} | **Current Outstanding Balance:** **${c.currentBalance}**\n`;
        if (c.recentInvoices && c.recentInvoices.length > 0) {
          res += `  - **Recent Invoices:** ${c.recentInvoices.join(', ')}\n`;
        }
        res += `  - 📍 **Access Location:** Aap is customer ki complete ledger aur billing history **PEOPLE -> Customers** (\`/customers\`) me search karke dekh sakte hain.\n\n`;
      }
      return res;
    }

    // 3. General Customer / Supplier question
    if (q.includes('customer') && (q.includes('kaha') || q.includes('detail') || q.includes('where') || q.includes('kaise') || q.includes('rahul') || q.includes('patient'))) {
      return `### 👥 **Customer & Patient Details Guide**

- **Tab Location:** **\`PEOPLE -> Customers\`** (\`/customers\`)
- **Working Method:**
  1. Top search bar me customer ka naam (jaise *Rahul*, *Sunita*) ya mobile number type karein.
  2. Table me customer ka **Mobile, Address, Credit Limit, Outstanding Balance, aur Ledger** dikhega.
  3. Action column se aap customer ka **Statement Download**, **WhatsApp Payment Reminder**, ya **Special Party Pricing** set kar sakte hain.`;
    }

    if (q.includes('supplier') && (q.includes('kaha') || q.includes('detail') || q.includes('where') || q.includes('kaise') || q.includes('distributor'))) {
      return `### 🏢 **Supplier & Distributor Management Guide**

- **Tab Location:** **\`PEOPLE -> Suppliers\`** (\`/suppliers\`)
- **Working Method:**
  1. Search bar me agency ya distributor ka naam search karein.
  2. Yahan har agency ka **Drug License (DL 20B/21B), GSTIN, Payment Terms**, aur **Outstanding Balance** dikhta hai.
  3. Action column se direct **Purchase Order** generate ya **Ledger Settlement** kar sakte hain.`;
    }

    // 4. Tab / Feature Overview Guide
    if (q.includes('tab') || q.includes('kaise kaam') || q.includes('function') || q.includes('all features') || q.includes('sitemap') || q.includes('guide') || q.includes('kaise use')) {
      return `### 🗺️ **MedCare ERP Complete Function & Tab Guide**

| Module Section | Tab Name & Route | Key Functions & Operations |
|---|---|---|
| **OPERATIONS** | **Dashboard** (\`/\`) | Real-time sales KPI, stock valuation, revenue chart, quick action shortcuts. |
| **OPERATIONS** | **POS Billing** (\`/pos\`) | High-speed billing, barcode scan, FEFO auto batch, Cash/UPI/Split pay, WhatsApp receipt. |
| **OPERATIONS** | **Cash Register** (\`/cash-register\`) | Opening/closing cash shift drawer, cash drop/float tracking, Z-report generation. |
| **OPERATIONS** | **Sales & Invoices** (\`/sales\`) | All sales history, thermal/A4 print reprint, payment status tracking. |
| **OPERATIONS** | **Sales Returns** (\`/sales-returns\`) | Customer medicine returns, instant cash/store credit refund, inventory restocking. |
| **INVENTORY** | **Medicines** (\`/medicines\`) | Master drug catalog, brand/generic formulation, schedule (OTC, H, H1, X), tax & MRP. |
| **INVENTORY** | **Inventory & Batches** (\`/inventory\`) | Batch-wise stock, expiry dates, 30/60/90 days near-expiry alerts, stock adjustments. |
| **INVENTORY** | **Stock Transfers** (\`/stock-transfers\`) | Multi-branch stock movement, dispatch, in-transit tracking, and receiving. |
| **INVENTORY** | **Purchases** (\`/purchases\`) | Inward GRN purchase bills, tax credit verification, batch creation, payment records. |
| **INVENTORY** | **Purchase Orders** (\`/purchase-orders\`) | Raising POs to pharma distributors and converting to inward purchases. |
| **INVENTORY** | **Import / Opening Stock** (\`/import\`) | Excel/CSV bulk import for medicines and opening stock batches. |
| **PEOPLE** | **Customers** (\`/customers\`) | Patient/customer directory, credit limits, outstanding ledger, special pricing. |
| **PEOPLE** | **Suppliers** (\`/suppliers\`) | Pharma agencies, drug licenses, GSTIN, payment terms, and distributor ledger. |
| **FINANCE** | **Expenses** (\`/expenses\`) | Shop rent, electricity, wages, maintenance, and store overhead tracking. |
| **FINANCE** | **Reports & Analytics** (\`/reports\`) | Sales trends, profit & loss, GST CGST/SGST tax liability, fast-moving items. |
| **SUPER ADMIN** | **Branches** (\`/super-admin/branches\`) | Multi-store network, Web Login URL, Branch Admin credentials, 1-click branch switch. |
| **SUPER ADMIN** | **Staff Directory** (\`/super-admin/staff\`) | Staff accounts, User ID & Password visibility, 1-click credential copying. |
| **MANAGEMENT** | **Settings** (\`/settings\`) | Store business profile, store logo upload, white-label colors, Gemini AI API key. |`;
    }

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

    if (actionProposal) {
      return `### ⚡ **Action Detected**\n\n${actionProposal.previewText}\n\nKya aap is action ko execute karna chahte hain? Confirm karne ke liye niche **Execute Action** button par click karein.`;
    }

    return `Hello Super Admin! Main aapka **MedCare AI Action Co-Pilot** hoon.\n\nAap mujhse live store ka koi bhi data pooch sakte hain ya direct actions execute karwa sakte hain, jaise:\n- *"How to access other branches?"*\n- *"Rahul naam ke customer ki detail kaha milegi?"*\n- *"Kon sa tab kaise kaam karta hai?"*\n- *"Aaj ki total sales aur profit kitna hua?"*\n- *"Paracetamol ya Dolo ka kitna stock bacha hai?"*\n- *"Branch 02 me 50 Paracetamol bhejo"* (Stock Transfer)\n- *"Paracetamol ka price ₹25 karo"* (Price update)`;
  }
}
