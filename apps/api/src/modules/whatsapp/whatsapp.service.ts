import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  Browsers,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';

export interface SendMessageOptions {
  branchId: string;
  recipientPhone: string;
  recipientName?: string;
  messageType: 'TEXT' | 'BILL_INVOICE' | 'PAYMENT_RECEIPT' | 'DUE_REMINDER' | 'PAYMENT_CONFIRMATION' | 'DIRECT_CHAT';
  content: string;
  customerId?: string;
  invoiceId?: string;
  paymentId?: string;
  sentByUserId?: string;
}

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private sockets = new Map<string, WASocket>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private sessionDir: string;

  
  async resolveBranchId(branchId?: string): Promise<string> {
    if (branchId && typeof branchId === 'string' && branchId.trim()) {
      const trimmed = branchId.trim();
      const branch = await this.prisma.branch.findFirst({
        where: {
          OR: [{ id: trimmed }, { code: trimmed }, { name: trimmed }],
        },
      });
      if (branch) return branch.id;
    }
    const defaultBranch = await this.prisma.branch.findFirst({
      where: { OR: [{ isDefault: true }, { isActive: true }] },
      orderBy: { isDefault: 'desc' },
    });
    if (!defaultBranch) {
      throw new BadRequestException('No active store branch found to bind WhatsApp.');
    }
    return defaultBranch.id;
  }

  private async safeUpsertSession(branchId: string, data: { status?: string; phoneNumber?: string | null; pushName?: string | null; qrCode?: string | null; lastSeenAt?: Date | null }): Promise<any> {
    try {
      const existing = await this.prisma.whatsAppSession.findFirst({
        where: { branchId },
      });
      if (existing) {
        return await this.prisma.whatsAppSession.update({
          where: { id: existing.id },
          data,
        });
      } else {
        return await this.prisma.whatsAppSession.create({
          data: {
            branchId,
            status: data.status || 'DISCONNECTED',
            phoneNumber: data.phoneNumber || null,
            pushName: data.pushName || null,
            qrCode: data.qrCode || null,
            lastSeenAt: data.lastSeenAt || null,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`safeUpsertSession error for branch ${branchId}: ${err.message}`);
      return null;
    }
  }

  constructor(private prisma: PrismaService) {
    this.sessionDir = path.join(process.cwd(), 'data', 'whatsapp_sessions');
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing WhatsApp Service...');
    try {
      const activeSessions = await this.prisma.whatsAppSession.findMany({
        where: { status: 'CONNECTED' },
      });
      for (const session of activeSessions) {
        this.initSocket(session.branchId).catch((err) => {
          this.logger.warn(`Could not auto-restore session for branch ${session.branchId}: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed reading saved sessions: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    for (const [branchId, sock] of this.sockets.entries()) {
      try {
        sock.end(undefined);
      } catch (e) {}
    }
    this.sockets.clear();
  }

  normalizePhoneNumber(phone: string): { jid: string; cleanNumber: string } {
    if (!phone) throw new BadRequestException('Phone number is required');
    let clean = phone.replace(/[^0-9]/g, '');

    if (clean.length === 10) {
      clean = `91${clean}`;
    }

    if (clean.length < 10 || clean.length > 15) {
      throw new BadRequestException(`Invalid mobile number format: ${phone}`);
    }

    return {
      cleanNumber: `+${clean}`,
      jid: `${clean}@s.whatsapp.net`,
    };
  }

  async initSocket(branchId: string, forceFresh = false): Promise<WASocket> {
    if (!branchId) throw new BadRequestException('Branch ID is required');

    const branchAuthDir = path.join(this.sessionDir, branchId);

    if (forceFresh) {
      if (this.sockets.has(branchId)) {
        try {
          const oldSock = this.sockets.get(branchId);
          oldSock?.end(undefined);
        } catch (e) {}
        this.sockets.delete(branchId);
      }
      try {
        fs.rmSync(branchAuthDir, { recursive: true, force: true });
      } catch (e) {}
    } else if (this.sockets.has(branchId)) {
      return this.sockets.get(branchId)!;
    }

    if (!fs.existsSync(branchAuthDir)) {
      fs.mkdirSync(branchAuthDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(branchAuthDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    this.sockets.set(branchId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          await this.safeUpsertSession(branchId, {
            status: 'QR_READY',
            qrCode: qrDataUrl,
          });
          this.logger.log(`New WhatsApp QR generated for branch: ${branchId}`);
        } catch (err: any) {
          this.logger.error(`Error generating QR code: ${err.message}`);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const rawPhone = userJid.split(':')[0] || userJid.split('@')[0];
        const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
        const pushName = sock.user?.name || (sock.user as any)?.notify || 'Store WhatsApp';

        await this.safeUpsertSession(branchId, {
          status: 'CONNECTED',
          phoneNumber: formattedPhone,
          pushName,
          qrCode: null,
          lastSeenAt: new Date(),
        });
        this.logger.log(`WhatsApp connected for branch ${branchId}: ${formattedPhone} (${pushName})`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger.warn(`WhatsApp connection closed for branch ${branchId}, statusCode: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          this.sockets.delete(branchId);
          try {
            fs.rmSync(branchAuthDir, { recursive: true, force: true });
          } catch (e) {}

          await this.safeUpsertSession(branchId, {
            status: 'DISCONNECTED',
            qrCode: null,
          });
        } else if (shouldReconnect) {
          if (this.reconnectTimeouts.has(branchId)) {
            clearTimeout(this.reconnectTimeouts.get(branchId)!);
          }
          const timeout = setTimeout(() => {
            this.initSocket(branchId).catch(() => {});
          }, 4000);
          this.reconnectTimeouts.set(branchId, timeout);
        } else {
          this.sockets.delete(branchId);
          await this.safeUpsertSession(branchId, {
            status: 'DISCONNECTED',
            qrCode: null,
          });
        }
      }
    });

    return sock;
  }

  async getSessionStatus(branchId?: string) {
    const activeBranchId = await this.resolveBranchId(branchId);
    let session = null;
    try {
      session = await this.prisma.whatsAppSession.findFirst({
        where: { branchId: activeBranchId },
      });
    } catch (e) {}

    const isLiveConnected = this.sockets.has(activeBranchId) && session?.status === 'CONNECTED';

    return {
      branchId: activeBranchId,
      status: isLiveConnected ? 'CONNECTED' : (session?.status || 'DISCONNECTED'),
      phoneNumber: session?.phoneNumber || null,
      pushName: session?.pushName || null,
      qrCode: session?.status === 'QR_READY' ? session?.qrCode : null,
      lastSeenAt: session?.lastSeenAt || null,
    };
  }

  async connectSession(branchId?: string) {
    const activeBranchId = await this.resolveBranchId(branchId);

    await this.safeUpsertSession(activeBranchId, { status: 'CONNECTING', qrCode: null });

    this.initSocket(activeBranchId, true).catch((err) => {
      this.logger.error(`Background initSocket error for branch ${activeBranchId}: ${err.message}`);
    });

    // Poll briefly for fast QR emission
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const s = await this.prisma.whatsAppSession.findFirst({
          where: { branchId: activeBranchId },
        });
        if (s?.status === 'QR_READY' && s?.qrCode) {
          return this.getSessionStatus(activeBranchId);
        }
        if (s?.status === 'CONNECTED') {
          return this.getSessionStatus(activeBranchId);
        }
      } catch (e) {}
    }

    return this.getSessionStatus(activeBranchId);
  }

  async disconnectSession(branchId?: string) {
    const activeBranchId = await this.resolveBranchId(branchId);
    branchId = activeBranchId;
    if (this.sockets.has(branchId)) {
      try {
        const sock = this.sockets.get(branchId);
        await sock?.logout();
        sock?.end(undefined);
      } catch (e) {}
      this.sockets.delete(branchId);
    }

    const branchAuthDir = path.join(this.sessionDir, branchId);
    try {
      fs.rmSync(branchAuthDir, { recursive: true, force: true });
    } catch (e) {}

    await this.prisma.whatsAppSession.upsert({
      where: { branchId },
      create: { branchId, status: 'DISCONNECTED', qrCode: null, phoneNumber: null, pushName: null },
      update: { status: 'DISCONNECTED', qrCode: null, phoneNumber: null, pushName: null },
    });

    return { success: true, message: 'WhatsApp session disconnected successfully' };
  }

  async sendMessage(options: SendMessageOptions) {
    const { jid, cleanNumber } = this.normalizePhoneNumber(options.recipientPhone);

    const log = await this.prisma.whatsAppMessageLog.create({
      data: {
        branchId: options.branchId,
        customerId: options.customerId || null,
        invoiceId: options.invoiceId || null,
        paymentId: options.paymentId || null,
        messageType: options.messageType,
        recipientPhone: cleanNumber,
        recipientName: options.recipientName || 'Customer',
        content: options.content,
        status: 'QUEUED',
        sentByUserId: options.sentByUserId || null,
      },
    });

    const sock = this.sockets.get(options.branchId);
    if (!sock) {
      await this.prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: 'WhatsApp is not connected for this branch. Please scan QR code in Settings.' },
      });
      throw new BadRequestException('WhatsApp is not connected for this branch. Please scan QR in Settings -> WhatsApp Integration.');
    }

    try {
      await this.prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { status: 'SENDING' },
      });

      await sock.sendMessage(jid, { text: options.content });

      const updatedLog = await this.prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          error: null,
        },
      });

      return { success: true, log: updatedLog };
    } catch (err: any) {
      await this.prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: err.message || 'Failed to dispatch WhatsApp message' },
      });
      throw new BadRequestException(`WhatsApp sending failed: ${err.message}`);
    }
  }

  async sendBillInvoice(branchId: string, invoiceId: string, customNote?: string, sentByUserId?: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        branch: true,
        items: { include: { medicine: true, batch: true } },
        payments: true,
      },
    });

    if (!invoice) throw new NotFoundException(`Invoice #${invoiceId} not found`);

    const customerPhone = invoice.customer?.mobile;
    if (!customerPhone) {
      throw new BadRequestException('Customer does not have a registered mobile number.');
    }

    const shopName = invoice.branch?.name || 'MedCare Pharmacy';
    const shopPhone = invoice.branch?.phone || '';
    const customerName = invoice.customer?.name || 'Valued Customer';
    const totalNum = Number(invoice.totalAmount || 0);
    const paidNum = (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const dueNum = Math.max(0, totalNum - paidNum);

    const total = totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const paid = paidNum.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const due = dueNum.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const dateStr = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let itemsSummary = '';
    invoice.items.slice(0, 8).forEach((it) => {
      itemsSummary += `• ${it.medicine?.name || 'Item'} (Qty: ${it.qty}) - ₹${(it.lineTotal || 0).toFixed(2)}\n`;
    });
    if (invoice.items.length > 8) {
      itemsSummary += `• ...and ${invoice.items.length - 8} more medicines\n`;
    }

    const message = `🏥 *${shopName}*
📄 *TAX INVOICE / CASH MEMO*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
🧾 *Invoice No:* #${invoice.invoiceNumber}
📅 *Date:* ${dateStr}

*Prescribed Items:*
${itemsSummary}━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* *₹${total}*
💳 *Amount Paid:* ₹${paid}
${dueNum > 0 ? `⚠️ *Pending Due:* *₹${due}*\n` : '✅ *Payment Status:* Fully Paid\n'}
${customNote ? `\n💬 *Note:* ${customNote}\n` : ''}
🙏 *Thank you for your trust! Wishing you a speedy recovery.*
📞 Store Helpline: ${shopPhone}`;

    return this.sendMessage({
      branchId: invoice.branchId,
      recipientPhone: customerPhone,
      recipientName: customerName,
      messageType: 'BILL_INVOICE',
      content: message,
      customerId: invoice.customerId || undefined,
      invoiceId: invoice.id,
      sentByUserId,
    });
  }

  async sendDueReminder(branchId: string, customerId: string, customNote?: string, sentByUserId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);
    if (!customer.mobile) throw new BadRequestException('Customer does not have a registered mobile number.');

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    const shopName = branch?.name || 'MedCare Pharmacy';
    const shopPhone = branch?.phone || '';
    const balance = Number(customer.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const message = `🏥 *${shopName}*
🔔 *OUTSTANDING PAYMENT REMINDER*
━━━━━━━━━━━━━━━━━━━━
Namaste *${customer.name}* ji,

This is a gentle payment reminder regarding your pending medical ledger balance at *${shopName}*.

⚠️ *Outstanding Balance:* *₹${balance}*
${customNote ? `\n💬 *Message:* ${customNote}\n` : ''}
Kindly settle the pending balance at your earliest convenience. You can visit the counter or pay via UPI.

📍 *Store Address:* ${branch?.address || 'Main Road'}
📞 *Contact:* ${shopPhone}

🙏 Thank you for your continued association with us!`;

    return this.sendMessage({
      branchId,
      recipientPhone: customer.mobile,
      recipientName: customer.name,
      messageType: 'DUE_REMINDER',
      content: message,
      customerId: customer.id,
      sentByUserId,
    });
  }

  async sendPaymentConfirmation(branchId: string, paymentId: string, customNote?: string, sentByUserId?: string) {
    const payment = await this.prisma.salesPayment.findUnique({
      where: { id: paymentId },
      include: {
        salesInvoice: {
          include: {
            customer: true,
            branch: true,
            payments: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException(`Payment #${paymentId} not found`);

    const customer = payment.salesInvoice?.customer;
    if (!customer?.mobile) throw new BadRequestException('Customer mobile number not found');

    const branch = payment.salesInvoice?.branch;
    const shopName = branch?.name || 'MedCare Pharmacy';
    const amount = Number(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    const invoiceTotal = Number(payment.salesInvoice?.totalAmount || 0);
    const totalPaidOnInvoice = (payment.salesInvoice?.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingDue = Math.max(0, invoiceTotal - totalPaidOnInvoice);
    const remainingDueFormatted = remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const message = `🏥 *${shopName}*
✅ *PAYMENT RECEIVED CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━
Namaste *${customer.name}* ji,

We have successfully received your payment.

💰 *Amount Received:* *₹${amount}*
💳 *Payment Mode:* ${payment.paymentMode}
🧾 *Invoice Ref:* #${payment.salesInvoice?.invoiceNumber || 'N/A'}
${remainingDue > 0 ? `⚠️ *Remaining Due:* ₹${remainingDueFormatted}\n` : '🎉 *Invoice Status:* Fully Settled\n'}
${customNote ? `\n💬 *Note:* ${customNote}\n` : ''}
🙏 *Thank you for your payment!*
📞 Store Contact: ${branch?.phone || ''}`;

    return this.sendMessage({
      branchId,
      recipientPhone: customer.mobile,
      recipientName: customer.name,
      messageType: 'PAYMENT_CONFIRMATION',
      content: message,
      customerId: customer.id,
      invoiceId: payment.salesInvoiceId || undefined,
      paymentId: payment.id,
      sentByUserId,
    });
  }


  async getConversations(branchId?: string) {
    const activeBranchId = await this.resolveBranchId(branchId);
    
    // Fetch all logs for this branch
    const logs = await this.prisma.whatsAppMessageLog.findMany({
      where: { branchId: activeBranchId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
      },
    });

    // Also fetch customers and suppliers with phone numbers to populate contacts
    const [customers, suppliers] = await Promise.all([
      this.prisma.customer.findMany({
        where: { mobile: { not: null } },
        take: 30,
        select: { id: true, name: true, mobile: true },
      }),
      this.prisma.supplier.findMany({
        where: { phone: { not: '' } },
        take: 20,
        select: { id: true, name: true, phone: true },
      }),
    ]);

    const chatMap = new Map<string, any>();

    // Add logged messages
    for (const log of logs) {
      const phone = log.recipientPhone;
      if (!chatMap.has(phone)) {
        chatMap.set(phone, {
          id: log.id,
          phone,
          name: log.recipientName || log.customer?.name || phone,
          type: log.customerId ? 'CUSTOMER' : 'DIRECT',
          lastMessage: log.content,
          lastMessageType: log.messageType,
          lastMessageAt: log.createdAt,
          lastStatus: log.status,
          unreadCount: 0,
          customer: log.customer,
        });
      }
    }

    // Add customers without logs yet
    for (const c of customers) {
      if (c.mobile) {
        let cleanNumber = c.mobile;
        try {
          cleanNumber = this.normalizePhoneNumber(c.mobile).cleanNumber;
        } catch (e) {}

        if (!chatMap.has(cleanNumber) && !chatMap.has(c.mobile)) {
          chatMap.set(cleanNumber, {
            id: `c_${c.id}`,
            phone: cleanNumber,
            name: c.name,
            type: 'CUSTOMER',
            lastMessage: 'Tap to start a new chat',
            lastMessageType: 'DIRECT_CHAT',
            lastMessageAt: new Date(Date.now() - 3600000),
            lastStatus: 'SENT',
            unreadCount: 0,
            customer: c,
          });
        }
      }
    }

    // Add suppliers
    for (const s of suppliers) {
      if (s.phone) {
        let cleanNumber = s.phone;
        try {
          cleanNumber = this.normalizePhoneNumber(s.phone).cleanNumber;
        } catch (e) {}

        if (!chatMap.has(cleanNumber) && !chatMap.has(s.phone)) {
          chatMap.set(cleanNumber, {
            id: `s_${s.id}`,
            phone: cleanNumber,
            name: `${s.name} (Supplier)`,
            type: 'SUPPLIER',
            lastMessage: 'Tap to start distributor chat',
            lastMessageType: 'DIRECT_CHAT',
            lastMessageAt: new Date(Date.now() - 7200000),
            lastStatus: 'SENT',
            unreadCount: 0,
          });
        }
      }
    }

    return Array.from(chatMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  async getConversationMessages(branchId: string | undefined, phone: string) {
    const activeBranchId = await this.resolveBranchId(branchId);
    let cleanNumber = phone;
    try {
      cleanNumber = this.normalizePhoneNumber(phone).cleanNumber;
    } catch (e) {}

    const messages = await this.prisma.whatsAppMessageLog.findMany({
      where: {
        branchId: activeBranchId,
        OR: [
          { recipientPhone: cleanNumber },
          { recipientPhone: phone },
          { recipientPhone: { contains: phone.slice(-10) } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        invoice: true,
        customer: true,
      },
    });

    return messages;
  }

  async getMessageLogs(query: {
    branchId?: string;
    messageType?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.messageType) where.messageType = query.messageType;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { recipientPhone: { contains: query.search } },
        { recipientName: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.whatsAppMessageLog.count({ where }),
      this.prisma.whatsAppMessageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
