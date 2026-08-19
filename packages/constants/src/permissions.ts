export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  // Medicine
  { code: 'medicine.view', module: 'Medicine', description: 'View medicines list and details' },
  { code: 'medicine.create', module: 'Medicine', description: 'Create new medicines' },
  { code: 'medicine.edit', module: 'Medicine', description: 'Edit existing medicines' },
  { code: 'medicine.delete', module: 'Medicine', description: 'Delete or deactivate medicines' },

  // Inventory & Batches
  { code: 'inventory.view', module: 'Inventory', description: 'View stock levels, batches, and movements' },
  { code: 'inventory.adjust', module: 'Inventory', description: 'Perform stock adjustments' },
  { code: 'inventory.transfer', module: 'Inventory', description: 'Transfer stock between branches' },

  // Purchases
  { code: 'purchase.view', module: 'Purchase', description: 'View purchase orders and invoices' },
  { code: 'purchase.create', module: 'Purchase', description: 'Create purchase orders and receive stock' },
  { code: 'purchase.approve', module: 'Purchase', description: 'Approve and confirm purchase invoices' },
  { code: 'purchase.return', module: 'Purchase', description: 'Create and manage purchase returns' },

  // Sales & POS
  { code: 'sale.view', module: 'Sales', description: 'View sales invoices and transaction history' },
  { code: 'sale.create', module: 'Sales', description: 'Perform POS billing and complete sales' },
  { code: 'sale.cancel', module: 'Sales', description: 'Cancel completed sales invoices' },
  { code: 'sale.return', module: 'Sales', description: 'Process customer sales returns' },
  { code: 'sale.discount_override', module: 'Sales', description: 'Override default discount limits in POS' },

  // Customers
  { code: 'customer.view', module: 'Customer', description: 'View customers list and purchase history' },
  { code: 'customer.create', module: 'Customer', description: 'Add new customers' },
  { code: 'customer.edit', module: 'Customer', description: 'Edit customer information' },
  { code: 'customer.delete', module: 'Customer', description: 'Delete or deactivate customers' },

  // Suppliers
  { code: 'supplier.view', module: 'Supplier', description: 'View suppliers and purchase history' },
  { code: 'supplier.create', module: 'Supplier', description: 'Add new suppliers' },
  { code: 'supplier.edit', module: 'Supplier', description: 'Edit supplier information' },
  { code: 'supplier.delete', module: 'Supplier', description: 'Delete or deactivate suppliers' },

  // Expenses & Finance
  { code: 'expense.view', module: 'Expense', description: 'View business expenses' },
  { code: 'expense.create', module: 'Expense', description: 'Record new business expenses' },
  { code: 'expense.edit', module: 'Expense', description: 'Edit or delete recorded expenses' },

  // Reports
  { code: 'report.view', module: 'Report', description: 'View financial, sales, and inventory reports' },
  { code: 'report.export', module: 'Report', description: 'Export reports to PDF, CSV, or Excel' },

  // User & Role Management
  { code: 'user.manage', module: 'Administration', description: 'Manage users, accounts, and credentials' },
  { code: 'role.manage', module: 'Administration', description: 'Manage roles and role permissions' },

  // Business Settings & Branches
  { code: 'settings.manage', module: 'Administration', description: 'Configure business profile, branding, and tax' },
  { code: 'branch.manage', module: 'Administration', description: 'Manage multiple physical branches' },
  { code: 'printer.manage', module: 'Administration', description: 'Configure thermal and network printers' },

  // System & Audit
  { code: 'audit.view', module: 'Administration', description: 'View system audit logs and history' },
  { code: 'backup.manage', module: 'Administration', description: 'Create, download, and restore database backups' },
  { code: 'notification.view', module: 'System', description: 'View system notifications and alerts' },
];

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);
