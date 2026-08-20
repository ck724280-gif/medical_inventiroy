const fs = require('fs');

const file = 'apps/web/src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Line 1717
content = content.replace(
  /className="rounded-2xl border border-red-900 bg-slate-900 /g,
  'className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 '
);

// 2. Line 1656, 1693
content = content.replace(
  /bg-slate-900 text-sky-300 border border-slate-700/g,
  'bg-slate-100 dark:bg-slate-900 text-sky-600 dark:text-sky-300 border border-slate-300 dark:border-slate-700'
);

content = content.replace(
  /bg-slate-900 text-white border border-slate-700/g,
  'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700'
);

fs.writeFileSync(file, content);
console.log('Fixed edge cases in pos/page.tsx');
