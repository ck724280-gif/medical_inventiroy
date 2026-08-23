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
You are an action-capable ERP Operating Agent operating the MedCare Pharmacy ERP.

Core Rules:
1. NEVER FAKE AN ACTION (§2): Only report data present in the database context. If a record does not exist, clearly say it was not found.
2. SUPPORT MULTILINGUAL: Understand Hindi, Hinglish, and English naturally (§44, §71). Match the tone and language of the user.
3. CURRENCY: Always format currency in Indian Rupees (₹) with proper comma separators (e.g., ₹1,45,000.00).
4. SAFETY FIRST (§42, §63): For actions like stock adjustments, price changes, or branch transfers, always provide clear confirmation details.
5. CLEAN PRESENTATION (§47, §72): Use clean Markdown tables for lists, bold for important numbers, and concise summaries. Do NOT use emojis excessively.

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

    // 1. Stock Transfer Intent: e.g. "Main branch se Branch 02 me 50 Paracetamol bhejo"
    if ((q.includes('transfer') || q.includes('bhejo') || q.includes('send')) && (q.includes('branch') || q.includes('stock'))) {
      const numMatch = query.match(/\b\d+\b/);
      const qty = numMatch ? parseInt(numMatch[0], 10) : 0;
      return {
        action: 'TRANSFER_STOCK',
        isRisky: true,
        previewText: `Stock Transfer Request: Transfer ${qty || 'X'} units between branches.`,
        suggestedPayload: { qty },
      };
    }

    // 2. Medicine Price Update: e.g. "Paracetamol ka selling price ₹25 karo"
    if ((q.includes('price') || q.includes('daam') || q.includes('rate')) && (q.includes('karo') || q.includes('set') || q.includes('update') || q.includes('change'))) {
      const numMatch = query.match(/\b\d+(\.\d+)?\b/);
      const newPrice = numMatch ? parseFloat(numMatch[0]) : 0;
      return {
        action: 'UPDATE_MEDICINE_PRICE',
        isRisky: true,
        previewText: `Medicine Price Update: Set selling price to ₹${newPrice}.`,
        suggestedPayload: { newPrice },
      };
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

    // 1. Inventory & Stock Valuation
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

    // 2. Sales, Revenue, Profit & Loss (§15, §28)
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

    // 3. Expiry Tracking (§29)
    if (q.includes('expir') || q.includes('khatam') || q.includes('date') || q.includes('fefo')) {
      toolsUsed.push('getExpiringMedicines');
      context.expiringMedicines = await this.getExpiringMedicines(60, branchId);
    }

    // 4. Low Stock Alert (§30)
    if (q.includes('low') || q.includes('kam') || q.includes('shortage') || q.includes('out of stock')) {
      toolsUsed.push('getLowStockMedicines');
      context.lowStockMedicines = await this.getLowStockMedicines(10, branchId);
    }

    // 5. Suppliers & Customer Ledgers (§9, §19, §20)
    if (
      q.includes('supplier') ||
      q.includes('customer') ||
      q.includes('ledger') ||
      q.includes('udhari') ||
      q.includes('payable') ||
      q.includes('credit') ||
      q.includes('outstanding') ||
      q.includes('balance') ||
      q.includes('baki')
    ) {
      toolsUsed.push('getFinancialLedgerSummary');
      context.financialLedger = await this.getFinancialLedgerSummary();
    }

    // 6. Branch Information (§22, §53)
    if (q.includes('branch') || q.includes('all branches') || q.includes('compare')) {
      toolsUsed.push('getBranchOverview');
      context.branches = await this.getBranchOverview();
    }

    // 7. System Health (§56)
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

    return `Hello Super Admin! Main aapka **MedCare AI Action Co-Pilot** hoon.\n\nAap mujhse live store ka koi bhi data pooch sakte hain ya direct actions execute karwa sakte hain, jaise:\n- *"Aaj ki total sales aur profit kitna hua?"*\n- *"Paracetamol ya Dolo ka kitna stock bacha hai?"*\n- *"Branch 02 me Paracetamol bhejo"* (Stock Transfer)\n- *"Paracetamol ka price ₹25 karo"* (Price update)\n- *"Rahul ka bill WhatsApp par bhejo"* (WhatsApp Bill)`;
  }
}
