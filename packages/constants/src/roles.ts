import { RoleName } from '@medical-inventory/shared-types';
import { PERMISSION_CODES } from './permissions.js';

export interface DefaultRoleConfig {
  name: RoleName;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export const DEFAULT_ROLES: DefaultRoleConfig[] = [
  {
    name: RoleName.OWNER,
    description: 'Business Owner / Super Administrator with complete system access',
    isSystem: true,
    permissions: PERMISSION_CODES, // Full access
  },
  {
    name: RoleName.ADMIN,
    description: 'System Administrator with business settings, users, inventory, purchases, sales, and reports access',
    isSystem: true,
    permissions: PERMISSION_CODES.filter((p) => p !== 'backup.manage'),
  },
  {
    name: RoleName.MANAGER,
    description: 'Store Manager supervising inventory, purchases, sales, staff, and analytics',
    isSystem: true,
    permissions: [
      'medicine.view', 'medicine.create', 'medicine.edit',
      'inventory.view', 'inventory.adjust', 'inventory.transfer',
      'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.return',
      'sale.view', 'sale.create', 'sale.cancel', 'sale.return', 'sale.discount_override',
      'customer.view', 'customer.create', 'customer.edit',
      'supplier.view', 'supplier.create', 'supplier.edit',
      'expense.view', 'expense.create',
      'report.view', 'report.export',
      'notification.view',
      'printer.manage',
    ],
  },
  {
    name: RoleName.PHARMACIST,
    description: 'Licensed Pharmacist managing medicine dispensation, POS billing, batches, and prescriptions',
    isSystem: true,
    permissions: [
      'medicine.view', 'medicine.edit',
      'inventory.view',
      'sale.view', 'sale.create', 'sale.return',
      'customer.view', 'customer.create', 'customer.edit',
      'notification.view',
    ],
  },
  {
    name: RoleName.CASHIER,
    description: 'Billing Cashier operating POS counter and customer payments',
    isSystem: true,
    permissions: [
      'medicine.view',
      'inventory.view',
      'sale.view', 'sale.create',
      'customer.view', 'customer.create',
      'notification.view',
    ],
  },
  {
    name: RoleName.INVENTORY_STAFF,
    description: 'Warehouse / Stock Staff handling stock receiving, audits, and movements',
    isSystem: true,
    permissions: [
      'medicine.view',
      'inventory.view', 'inventory.adjust', 'inventory.transfer',
      'purchase.view', 'purchase.create',
      'supplier.view',
      'notification.view',
    ],
  },
  {
    name: RoleName.ACCOUNTANT,
    description: 'Accountant overseeing finances, expenses, supplier settlements, and tax reports',
    isSystem: true,
    permissions: [
      'purchase.view',
      'sale.view',
      'expense.view', 'expense.create', 'expense.edit',
      'supplier.view',
      'customer.view',
      'report.view', 'report.export',
      'notification.view',
    ],
  },
];
