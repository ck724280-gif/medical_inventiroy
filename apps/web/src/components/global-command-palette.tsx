'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Pill,
  Users,
  Truck,
  FileText,
  Boxes,
  Compass,
  ArrowRight,
  X,
  Loader2,
  Building2,
  ShoppingCart,
  Receipt,
  Settings,
  BarChart3,
  Coins,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { HighlightMatch } from './ui/smart-autocomplete';

interface CommandItem {
  id: string;
  type: 'nav' | 'medicine' | 'customer' | 'supplier' | 'invoice' | 'batch';
  title: string;
  subtitle?: string;
  badge?: string;
  url?: string;
  onSelect?: () => void;
  metadata?: Record<string, any>;
}

const STATIC_NAVIGATION: CommandItem[] = [
  { id: 'nav-pos', type: 'nav', title: 'POS Billing Counter', subtitle: 'Fast checkout, thermal printing & barcode scan', url: '/pos', badge: 'Sales' },
  { id: 'nav-inventory', type: 'nav', title: 'Inventory & Batches Master', subtitle: 'Stock balances, expiry tracker & batch adjustment', url: '/inventory', badge: 'Stock' },
  { id: 'nav-medicines', type: 'nav', title: 'Medicine Master', subtitle: 'Manage drug directory, molecules & HSN codes', url: '/medicines', badge: 'Catalog' },
  { id: 'nav-customers', type: 'nav', title: 'Customers & Credit Ledger', subtitle: 'Patient registry, phone numbers & outstanding dues', url: '/customers', badge: 'Parties' },
  { id: 'nav-suppliers', type: 'nav', title: 'Suppliers & Vendors', subtitle: 'Distributor directory, GSTIN & payable ledger', url: '/suppliers', badge: 'Parties' },
  { id: 'nav-purchases', type: 'nav', title: 'Purchase Invoices & GRN', subtitle: 'Inward stock bills & supplier payments', url: '/purchases', badge: 'Purchase' },
  { id: 'nav-purchase-orders', type: 'nav', title: 'Purchase Orders', subtitle: 'Draft & send POs to medicine distributors', url: '/purchase-orders', badge: 'Purchase' },
  { id: 'nav-sales', type: 'nav', title: 'Sales History & Invoices', subtitle: 'Past receipts, customer billing audit & reprints', url: '/sales', badge: 'Sales' },
  { id: 'nav-sales-returns', type: 'nav', title: 'Sales Returns & Credit Notes', subtitle: 'Customer medicine return processing', url: '/sales-returns', badge: 'Sales' },
  { id: 'nav-expenses', type: 'nav', title: 'Daily Expenses', subtitle: 'Store maintenance, petty cash & utility expenses', url: '/expenses', badge: 'Accounts' },
  { id: 'nav-reports', type: 'nav', title: 'Reports & Analytics', subtitle: 'GST summaries, sales breakdown & profit/loss', url: '/reports', badge: 'Reports' },
  { id: 'nav-import', type: 'nav', title: 'Opening Stock Import', subtitle: 'Bulk Excel/CSV upload for inventory', url: '/import', badge: 'Tools' },
  { id: 'nav-settings', type: 'nav', title: 'Store Settings & Branding', subtitle: 'Pharmacy license, logo, receipt template & users', url: '/settings', badge: 'Admin' },
];

export function GlobalCommandPalette() {
  const router = useRouter();
  const { selectedBranchId } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandItem[]>(STATIC_NAVIGATION);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setResults(STATIC_NAVIGATION);
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Live Multi-Entity Search from 1st character
  const performSearch = useCallback(
    async (searchVal: string) => {
      const trimmed = searchVal.trim();
      if (!trimmed) {
        setResults(STATIC_NAVIGATION);
        setIsLoading(false);
        setHighlightedIndex(0);
        return;
      }

      // Filter static navigation shortcuts
      const matchedNav = STATIC_NAVIGATION.filter((n) =>
        `${n.title} ${n.subtitle}`.toLowerCase().includes(trimmed.toLowerCase())
      );

      setIsLoading(true);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await apiClient.get('/search/universal', {
          params: {
            q: trimmed,
            branchId: selectedBranchId || undefined,
            limit: 25,
          },
          signal: controller.signal,
        });

        const apiResults: CommandItem[] = (res.data?.results || []).map((item: any) => ({
          id: `${item.type}-${item.id}`,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle,
          badge: item.badge || item.type.toUpperCase(),
          url: item.url,
          metadata: item.metadata,
        }));

        setResults([...matchedNav, ...apiResults]);
        setHighlightedIndex(0);
      } catch (err: any) {
        if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
          setResults(matchedNav);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBranchId]
  );

  // Debounced search trigger (100ms for instantaneous feeling)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      performSearch(query);
    }, 100);
    return () => clearTimeout(timer);
  }, [query, isOpen, performSearch]);

  const handleSelect = (item: CommandItem) => {
    setIsOpen(false);
    if (item.onSelect) {
      item.onSelect();
    } else if (item.url) {
      router.push(item.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < results.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : results.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      }
    }
  };

  const scrollIndexIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('li');
    items[index]?.scrollIntoView({ block: 'nearest' });
  };

  const getItemIcon = (type: CommandItem['type']) => {
    switch (type) {
      case 'medicine':
        return <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'customer':
        return <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'supplier':
        return <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'invoice':
        return <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'batch':
        return <Boxes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      default:
        return <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity">
      {/* Dialog Body */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
          <Search className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Universal Search: Type medicine, patient, supplier, invoice or page..."
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400 flex-shrink-0" />}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <ul ref={listRef} className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {results.map((item, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={item.id}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(item)}
                className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors duration-75 select-none ${
                  isHighlighted
                    ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800/80'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex-shrink-0">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      <HighlightMatch text={item.title} query={query} />
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <HighlightMatch text={item.subtitle} query={query} />
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.badge}
                    </span>
                  )}
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      isHighlighted ? 'text-sky-600 dark:text-sky-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </div>
              </li>
            );
          })}

          {!isLoading && results.length === 0 && (
            <li className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">No results found for &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by generic name, mobile number, invoice or barcode</p>
            </li>
          )}
        </ul>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px]">
                Enter
              </kbd>{' '}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px]">
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>
          <span className="hidden sm:inline font-medium text-sky-600 dark:text-sky-400">
            Tally-Style Instant Search
          </span>
        </div>
      </div>
    </div>
  );
}
