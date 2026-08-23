const fs = require('fs');
const files = [
    'd:/antigravity programme/medical_inventory/apps/web/src/app/customers/page.tsx',
    'd:/antigravity programme/medical_inventory/apps/web/src/app/suppliers/page.tsx',
    'd:/antigravity programme/medical_inventory/apps/web/src/app/reports/page.tsx',
    'd:/antigravity programme/medical_inventory/apps/web/src/app/settings/page.tsx'
];

const replacements = {
    'bg-slate-50 dark:bg-[#090d16]': 'bg-surface-page',
    'bg-white dark:bg-[#0f172a]': 'bg-surface-base',
    'border-slate-200 dark:border-slate-800': 'border-border-default',
    'border-slate-300 dark:border-slate-800': 'border-border-strong',
    'bg-slate-100/80 dark:bg-[#0c1322]': 'bg-surface-raised',
    'hover:bg-slate-50 dark:hover:bg-slate-800/40': 'hover:bg-surface-raised',
    'hover:bg-slate-100 dark:hover:bg-slate-800': 'hover:bg-surface-raised',
    'text-slate-900 dark:text-white': 'text-text-primary',
    'text-slate-800 dark:text-slate-200': 'text-text-primary',
    'text-slate-700 dark:text-slate-300': 'text-text-secondary',
    'text-slate-600 dark:text-slate-400': 'text-text-muted',
    'text-slate-600 dark:text-slate-300': 'text-text-muted',
    'text-slate-500 dark:text-slate-400': 'text-text-muted',
    'bg-sky-600 hover:bg-sky-500': 'bg-accent-primary hover:bg-accent-hover',
    'text-sky-600 dark:text-sky-400': 'text-accent-primary',
    'text-sky-500 dark:text-sky-400': 'text-accent-primary',
    'divide-slate-100 dark:divide-slate-800/60': 'divide-border-default',
    'divide-slate-200 dark:divide-slate-800': 'divide-border-default',
    'bg-slate-100 dark:bg-slate-800': 'bg-surface-raised',
    'hover:bg-slate-200 dark:hover:bg-slate-700': 'hover:bg-surface-active',
};

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        for (const [oldClass, newClass] of Object.entries(replacements)) {
            content = content.split(oldClass).join(newClass);
        }
        
        // Auto-inject PageHeader import if not present
        if (!content.includes('PageHeader')) {
            content = content.replace(
                "import { Header } from '../../components/header';",
                "import { Header } from '../../components/header';\nimport { PageHeader } from '../../components/ui/page-header';"
            );
        }

        fs.writeFileSync(f, content, 'utf8');
        console.log('Refactored ' + f);
    } else {
        console.log('Missing ' + f);
    }
});
