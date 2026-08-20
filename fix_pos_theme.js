const fs = require('fs');

const file = 'apps/web/src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove text-white from night-input
content = content.replace(/night-input([^"]*)text-white/g, 'night-input$1text-slate-900 dark:text-white');
content = content.replace(/text-white([^"]*)night-input/g, 'text-slate-900 dark:text-white$1night-input');

// 2. Fix Modal background wrappers
// <div className="rounded-2xl border border-slate-700 bg-slate-900 ...
content = content.replace(
  /className="rounded-2xl border border-slate-700 bg-slate-900 /g,
  'className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 '
);

// 3. Fix other hardcoded text-white in headers of those modals
// <h3 className="font-bold text-sm text-white">
content = content.replace(
  /<h3 className="font-bold text-sm text-white">/g,
  '<h3 className="font-bold text-sm text-slate-900 dark:text-white">'
);
content = content.replace(
  /<span className="font-mono font-bold text-white">/g,
  '<span className="font-mono font-bold text-slate-900 dark:text-white">'
);
content = content.replace(
  /<p className="text-sm font-bold text-white">/g,
  '<p className="text-sm font-bold text-slate-900 dark:text-white">'
);
content = content.replace(
  /<p className="font-semibold text-white">/g,
  '<p className="font-semibold text-slate-900 dark:text-white">'
);

// 4. Fix table rows that might have hardcoded text-white
// text-center bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-white
content = content.replace(
  /bg-slate-900 border border-slate-700 ([^"]*)text-white/g,
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 $1text-slate-900 dark:text-white'
);

// 5. Fix <button className="... hover:text-white"> that are close buttons
content = content.replace(
  /className="p-1 text-slate-400 hover:text-white"/g,
  'className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"'
);

fs.writeFileSync(file, content);
console.log('Fixed pos/page.tsx');
