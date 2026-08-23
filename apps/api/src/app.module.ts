import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PerformanceLoggingInterceptor } from './common/interceptors/performance-logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
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
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
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
import { PartyPricingModule } from './modules/party-pricing/party-pricing.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AppCacheModule } from './modules/cache/cache.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { StockTransfersModule } from './modules/stock-transfers/stock-transfers.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { SearchModule } from './modules/search/search.module';

// P6 New Modules
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { BackgroundJobsModule } from './modules/jobs/background-jobs.module';
import { SystemModule } from './modules/system/system.module';

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
    AppCacheModule,
    SuperAdminModule,
    StockTransfersModule,
    CashRegistersModule,
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
    PurchaseOrdersModule,
    PartyPricingModule,
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
    AiAssistantModule,
    SearchModule,
    // P6 New Modules
    ApprovalsModule,
    FeatureFlagsModule,
    BackgroundJobsModule,
    SystemModule,
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
    // 5. Global Performance Interceptor (§42: generates X-Request-ID)
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceLoggingInterceptor,
    },
    // 6. Global Response Transform Interceptor (§73: standard response shape, §42: requestId)
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    // 7. Global Exception Filters
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
