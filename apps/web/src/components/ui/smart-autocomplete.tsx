'use client';

import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { Search, Loader2, X, AlertCircle } from 'lucide-react';

export interface AutocompleteItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface SmartAutocompleteProps<T extends AutocompleteItem> {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (item: T) => void;
  onClear?: () => void;
  fetchResults?: (query: string, signal: AbortSignal) => Promise<T[]>;
  staticItems?: T[];
  filterFn?: (item: T, query: string) => boolean;
  renderItem?: (item: T, isSelected: boolean, query: string) => React.ReactNode;
  emptyMessage?: string;
  createNewAction?: {
    label: string;
    onClick: (query: string) => void;
  };
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  clearOnSelect?: boolean;
  icon?: React.ReactNode;
  debounceMs?: number;
  minChars?: number; // Defaults to 1 for first-character search!
  hotkey?: string;
  id?: string;
}

// Subtle Highlight Utility for match strings
export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) return <span>{text}</span>;

  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <span
            key={i}
            className="bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-semibold px-0.5 rounded"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function SmartAutocomplete<T extends AutocompleteItem>({
  placeholder = 'Type to search...',
  value,
  onChange,
  onSelect,
  onClear,
  fetchResults,
  staticItems,
  filterFn,
  renderItem,
  emptyMessage = 'No matching records found',
  createNewAction,
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  autoFocus = false,
  disabled = false,
  clearOnSelect = false,
  icon,
  debounceMs = 120,
  minChars = 1,
  hotkey,
  id,
}: SmartAutocompleteProps<T>) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [internalQuery, setInternalQuery] = useState(value || '');
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync external value
  useEffect(() => {
    if (value !== undefined && value !== internalQuery) {
      setInternalQuery(value);
    }
  }, [value]);

  // Global hotkey trigger
  useEffect(() => {
    if (!hotkey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key.toLowerCase() === hotkey.toLowerCase() || e.code.toLowerCase() === hotkey.toLowerCase()) &&
        !['input', 'textarea', 'select'].includes((document.activeElement?.tagName || '').toLowerCase())
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch or filter items whenever query changes
  const performSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < minChars) {
        setItems([]);
        setIsLoading(false);
        setIsOpen(false);
        return;
      }

      setError(null);

      // 1. Static items filtering
      if (staticItems) {
        const filtered = filterFn
          ? staticItems.filter((item) => filterFn(item, trimmed))
          : staticItems.filter((item) => {
              const text = `${item.title} ${item.subtitle || ''} ${item.description || ''}`.toLowerCase();
              return text.includes(trimmed.toLowerCase());
            });
        setItems(filtered);
        setIsOpen(true);
        setHighlightedIndex(filtered.length > 0 ? 0 : -1);
        return;
      }

      // 2. Dynamic async fetch
      if (fetchResults) {
        setIsLoading(true);
        setIsOpen(true);

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const results = await fetchResults(trimmed, controller.signal);
          setItems(results);
          setHighlightedIndex(results.length > 0 ? 0 : -1);
          setIsLoading(false);
        } catch (err: any) {
          if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
            setError('Failed to fetch search results');
            setIsLoading(false);
          }
        }
      }
    },
    [minChars, staticItems, filterFn, fetchResults]
  );

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.activeElement === inputRef.current && internalQuery.length >= minChars) {
        performSearch(internalQuery);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalQuery, debounceMs, minChars, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalQuery(val);
    onChange?.(val);
    if (val.trim().length >= minChars) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setItems([]);
    }
  };

  const handleSelect = (item: T) => {
    if (clearOnSelect) {
      setInternalQuery('');
      onChange?.('');
    } else {
      setInternalQuery(item.title);
      onChange?.(item.title);
    }
    setIsOpen(false);
    onSelect?.(item);
  };

  const handleClear = () => {
    setInternalQuery('');
    onChange?.('');
    setItems([]);
    setIsOpen(false);
    onClear?.();
    inputRef.current?.focus();
  };

  // Keyboard navigation (Tally-Style)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      if (internalQuery.length >= minChars) {
        performSearch(internalQuery);
      }
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < items.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : items.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        e.preventDefault();
        handleSelect(items[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const scrollIndexIntoView = (index: number) => {
    if (!listRef.current) return;
    const elements = listRef.current.querySelectorAll('li');
    const target = elements[index];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400" />
          ) : (
            icon || <Search className="w-4 h-4" />
          )}
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={internalQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (internalQuery.trim().length >= minChars) {
              setIsOpen(true);
              if (items.length === 0) performSearch(internalQuery);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-9 pr-12 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors duration-150 ${inputClassName}`}
        />

        {/* Right side icons / hotkeys */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {internalQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : hotkey ? (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded">
              {hotkey}
            </kbd>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown Popup */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-80 flex flex-col transition-all duration-150 ${dropdownClassName}`}
        >
          {/* Header indicator / result count */}
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span>
              {isLoading
                ? 'Searching records...'
                : items.length > 0
                ? `${items.length} records found (Use ↑↓ arrows & Enter)`
                : 'Search results'}
            </span>
            <span className="text-[9px] font-mono">Tally-Style Search</span>
          </div>

          {/* Results List */}
          <ul ref={listRef} role="listbox" className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-1">
            {items.map((item, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={item.id || index}
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(item)}
                  className={`px-3 py-2 cursor-pointer text-left transition-colors duration-75 select-none ${
                    isHighlighted
                      ? 'bg-sky-50 dark:bg-sky-950/50 border-l-4 border-sky-600 dark:border-sky-400 pl-2'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {renderItem ? (
                    renderItem(item, isHighlighted, internalQuery)
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          <HighlightMatch text={item.title} query={internalQuery} />
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            <HighlightMatch text={item.subtitle} query={internalQuery} />
                          </p>
                        )}
                        {item.description && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}

            {/* Empty State */}
            {!isLoading && items.length === 0 && (
              <li className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                <AlertCircle className="w-5 h-5 mx-auto mb-1.5 text-slate-400 dark:text-slate-500 opacity-60" />
                <p className="text-xs font-medium">{emptyMessage}</p>
                {createNewAction && internalQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      createNewAction.onClick(internalQuery);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/60 transition"
                  >
                    + {createNewAction.label} &quot;{internalQuery}&quot;
                  </button>
                )}
              </li>
            )}

            {/* Error State */}
            {error && (
              <li className="px-4 py-3 text-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40">
                {error}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
