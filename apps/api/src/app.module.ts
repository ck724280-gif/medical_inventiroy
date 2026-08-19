import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ManufacturersModule } from './modules/manufacturers/manufacturers.module';
import { UnitsModule } from './modules/units/units.module';
import { MedicinesModule } from './modules/medicines/medicines.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BatchesModule } from './modules/batches/batches.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { PosModule } from './modules/pos/pos.module';
import { SalesReturnsModule } from './modules/sales-returns/sales-returns.module';
import { PurchaseReturnsModule } from './modules/purchase-returns/purchase-returns.module';
import { PrintingModule } from './modules/printing/printing.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BackupModule } from './modules/backup/backup.module';
import { ImportExportModule } from './modules/import-export/import-export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SettingsModule,
    BranchesModule,
    CategoriesModule,
    ManufacturersModule,
    UnitsModule,
    MedicinesModule,
    SuppliersModule,
    CustomersModule,
    BatchesModule,
    InventoryModule,
    PurchasesModule,
    SalesModule,
    PosModule,
    SalesReturnsModule,
    PurchaseReturnsModule,
    PrintingModule,
    InvoicesModule,
    ExpensesModule,
    FinancialsModule,
    ReportsModule,
    DashboardModule,
    AuditModule,
    NotificationsModule,
    BackupModule,
    ImportExportModule,
  ],
  providers: [
    // 1. Global Auth Guard (all routes protected by default unless @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 2. Global RBAC Permissions Guard
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // 3. Global Rate Limiter Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 4. Global Audit Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // 5. Global Exception Filters
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}
