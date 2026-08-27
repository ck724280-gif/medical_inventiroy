/**
 * Audit Sidebar Routes against live Render API backend
 * Endpoint: https://medical-inventiroy.onrender.com
 * User: chiku542254@gmail.com / Admin@123
 */

const BASE_URL = 'https://medical-inventiroy.onrender.com/api';
const BRANCHES = {
  'MAIN-01': 'e80d4452-8497-4c34-aaf0-184fc3700146',
  'BR-02': 'eebc8329-3b2f-465a-a65e-7bca109bcd44',
  'VG-KDJ': '546119c8-cbfd-4e47-a638-a2e249471e2a',
};

async function main() {
  console.log('=== Step 1: Authenticating as Super Admin ===');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'chiku542254@gmail.com',
      password: 'Admin@123',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.accessToken || loginData.data?.accessToken || loginData.accessToken;
  const user = loginData.data?.user || loginData.user;
  console.log(`Authenticated as: ${user.name} (${user.email})`);
  console.log(`Roles: ${JSON.stringify(user.roles)}`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-branch-id': BRANCHES['MAIN-01'],
  };

  console.log('\n=== Step 2: Auditing 18 Sidebar Routes on Live API ===\n');

  const routes = [
    {
      section: 'Operations',
      menu: 'Dashboard',
      route: '/',
      endpoint: '/dashboard/summary?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Operations',
      menu: 'POS Billing',
      route: '/pos',
      endpoint: '/pos/search?q=paracetamol&branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Operations',
      menu: 'Cash Register',
      route: '/cash-register',
      endpoint: '/cash-registers/register/current',
    },
    {
      section: 'Operations',
      menu: 'Sales & Invoices',
      route: '/sales',
      endpoint: '/sales?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Operations',
      menu: 'Sales Returns',
      route: '/sales-returns',
      endpoint: '/sales-returns?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Operations',
      menu: 'Sales Returns (Invoice Lookup Gap Test)',
      route: '/sales-returns (lookup)',
      endpoint: '/sales/by-invoice/INV-TEST-001',
    },
    {
      section: 'Inventory',
      menu: 'Medicines',
      route: '/medicines',
      endpoint: '/medicines',
    },
    {
      section: 'Inventory',
      menu: 'Inventory & Batches',
      route: '/inventory',
      endpoint: '/batches?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Inventory',
      menu: 'Stock Transfers',
      route: '/stock-transfers',
      endpoint: '/stock-transfers?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Inventory',
      menu: 'Purchases',
      route: '/purchases',
      endpoint: '/purchases?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Inventory',
      menu: 'Purchase Orders',
      route: '/purchase-orders',
      endpoint: '/purchase-orders?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Inventory',
      menu: 'Opening / Closing Stock',
      route: '/import',
      endpoint: '/inventory/overview?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'People',
      menu: 'Customers',
      route: '/customers',
      endpoint: '/customers',
    },
    {
      section: 'People',
      menu: 'Suppliers',
      route: '/suppliers',
      endpoint: '/suppliers',
    },
    {
      section: 'Finance',
      menu: 'Expenses',
      route: '/expenses',
      endpoint: '/expenses?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Finance',
      menu: 'Reports & Analytics',
      route: '/reports',
      endpoint: '/reports/financial-summary?branchId=' + BRANCHES['MAIN-01'],
    },
    {
      section: 'Management',
      menu: 'Settings',
      route: '/settings',
      endpoint: '/settings/business',
    },
    {
      section: 'Super Admin',
      menu: 'Control Center',
      route: '/super-admin',
      endpoint: '/super-admin/overview',
    },
    {
      section: 'Super Admin',
      menu: 'Branches',
      route: '/super-admin/branches',
      endpoint: '/branches',
    },
    {
      section: 'Super Admin',
      menu: 'Staff Directory',
      route: '/super-admin/staff',
      endpoint: '/super-admin/staff',
    },
  ];

  const results = [];

  for (const item of routes) {
    const url = `${BASE_URL}${item.endpoint}`;
    const start = Date.now();
    try {
      const res = await fetch(url, { headers });
      const latency = Date.now() - start;
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {}

      const hasData = parsed && (
        (Array.isArray(parsed.data) && parsed.data.length > 0) ||
        (Array.isArray(parsed) && parsed.length > 0) ||
        (typeof parsed.data === 'object' && parsed.data !== null && Object.keys(parsed.data).length > 0) ||
        (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0)
      );

      const statusIcon = res.status === 200 ? (hasData ? '✅' : '⚠️') : '❌';

      results.push({
        ...item,
        status: res.status,
        latencyMs: latency,
        statusIcon,
        dataSummary: hasData ? (Array.isArray(parsed?.data) ? `Array[${parsed.data.length}]` : (Array.isArray(parsed) ? `Array[${parsed.length}]` : 'Object/Details')) : 'Empty / Error',
        rawSnippet: text.slice(0, 120),
      });

      console.log(`${statusIcon} [${res.status}] ${item.section} -> ${item.menu} (${latency}ms) - ${item.endpoint}`);
    } catch (err) {
      const latency = Date.now() - start;
      results.push({
        ...item,
        status: 'ERR',
        latencyMs: latency,
        statusIcon: '❌',
        dataSummary: err.message,
        rawSnippet: err.stack?.slice(0, 100),
      });
      console.log(`❌ [ERR] ${item.section} -> ${item.menu} (${latency}ms) - ${err.message}`);
    }
  }

  console.log('\n=== Summary Table ===\n');
  console.table(results.map(r => ({
    Menu: r.menu,
    Route: r.route,
    Endpoint: r.endpoint,
    Status: `${r.statusIcon} ${r.status}`,
    Latency: `${r.latencyMs}ms`,
    Data: r.dataSummary,
  })));

  return results;
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
