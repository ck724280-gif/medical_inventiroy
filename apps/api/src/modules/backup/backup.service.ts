import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import fs from 'fs';
import path from 'path';

interface BackupRecord {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: Date;
  status: 'COMPLETED' | 'FAILED';
}

const backupsList: BackupRecord[] = [];

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backupDir = path.join(process.cwd(), 'backups');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async listBackups() {
    return backupsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `medcare-backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    try {
      // Export database state securely to JSON snapshot
      const [
        settings,
        branding,
        branches,
        roles,
        users,
        categories,
        manufacturers,
        units,
        medicines,
        batches,
        suppliers,
        customers,
        purchases,
        sales,
        expenses,
      ] = await Promise.all([
        this.prisma.businessSettings.findMany(),
        this.prisma.businessBranding.findMany(),
        this.prisma.branch.findMany({ include: { settings: true } }),
        this.prisma.role.findMany({ include: { permissions: true } }),
        this.prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, isActive: true } }),
        this.prisma.medicineCategory.findMany(),
        this.prisma.manufacturer.findMany(),
        this.prisma.unit.findMany(),
        this.prisma.medicine.findMany({ include: { units: true } }),
        this.prisma.batch.findMany(),
        this.prisma.supplier.findMany(),
        this.prisma.customer.findMany(),
        this.prisma.purchaseInvoice.findMany({ include: { items: true, payments: true } }),
        this.prisma.salesInvoice.findMany({ include: { items: true, payments: true } }),
        this.prisma.expense.findMany(),
      ]);

      const snapshot = {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          app: 'MedCare Medical ERP',
        },
        data: {
          settings,
          branding,
          branches,
          roles,
          users,
          categories,
          manufacturers,
          units,
          medicines,
          batches,
          suppliers,
          customers,
          purchases,
          sales,
          expenses,
        },
      };

      const jsonStr = JSON.stringify(snapshot, null, 2);
      fs.writeFileSync(filepath, jsonStr, 'utf-8');

      const stat = fs.statSync(filepath);
      const record: BackupRecord = {
        id: `BCK-${Date.now().toString(36).toUpperCase()}`,
        filename,
        sizeBytes: stat.size,
        createdAt: new Date(),
        status: 'COMPLETED',
      };

      backupsList.push(record);
      return record;
    } catch (err: any) {
      this.logger.error('Failed to create database backup:', err);
      throw err;
    }
  }
}
