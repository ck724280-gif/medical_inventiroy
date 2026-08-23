'use client';

import * as React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { Button } from './button';

export interface Column<TData> {
  key: string;
  header: React.ReactNode;
  accessor?: keyof TData | ((row: TData) => React.ReactNode);
  render?: (row: TData, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: Column<TData>[];
  keyExtractor?: (item: TData, index: number) => string | number;
  isLoading?: boolean;
  loadingRowsCount?: number;
  emptyState?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  selectedRowId?: string | number;
  selectedRowIds?: (string | number)[];
  selectable?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  pagination?: DataTablePagination;
  className?: string;
  tableClassName?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  mobileCardRender?: (row: TData, index: number) => React.ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  keyExtractor = (item: any, idx) => item?.id ?? idx,
  isLoading = false,
  loadingRowsCount = 5,
  emptyState,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria.',
  onRowClick,
  selectedRowId,
  selectedRowIds = [],
  selectable = false,
  onSelectionChange,
  sortBy,
  sortOrder,
  onSort,
  pagination,
  className,
  tableClassName,
  stickyHeader = false,
  compact = false,
  mobileCardRender,
}: DataTableProps<TData>) {
  const isAllSelected =
    data.length > 0 &&
    data.every((item, idx) => selectedRowIds.includes(keyExtractor(item, idx)));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (row: TData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    const rowKey = keyExtractor(row, 0);
    const isSelected = selectedRowIds.includes(rowKey);
    if (isSelected) {
      onSelectionChange(
        data.filter((item, idx) => {
          const k = keyExtractor(item, idx);
          return k !== rowKey && selectedRowIds.includes(k);
        })
      );
    } else {
      const currentSelected = data.filter((item, idx) =>
        selectedRowIds.includes(keyExtractor(item, idx))
      );
      onSelectionChange([...currentSelected, row]);
    }
  };

  const handleHeaderSort = (col: Column<TData>) => {
    if (!col.sortable || !onSort) return;
    if (sortBy === col.key) {
      const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      onSort(col.key, nextOrder);
    } else {
      onSort(col.key, 'asc');
    }
  };

  const renderCellValue = (col: Column<TData>, row: TData, index: number) => {
    if (col.render) {
      return col.render(row, index);
    }
    if (typeof col.accessor === 'function') {
      return col.accessor(row);
    }
    if (col.accessor) {
      return (row as any)[col.accessor];
    }
    return (row as any)[col.key];
  };

  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center justify-center';
    if (align === 'right') return 'text-right justify-end';
    return 'text-left justify-start';
  };

  return (
    <div
      className={cn(
        'w-full flex flex-col rounded-xl border border-border bg-surface-base overflow-hidden shadow-sm',
        className
      )}
    >
      {/* Desktop & Tablet Table View (>= sm) */}
      <div className="hidden sm:block overflow-x-auto w-full">
        <table className={cn('w-full text-sm text-left border-collapse', tableClassName)}>
          <thead
            className={cn(
              'bg-surface-raised border-b border-border text-xs font-semibold text-text-secondary select-none',
              stickyHeader && 'sticky top-0 z-10 backdrop-blur-sm'
            )}
          >
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderSort(col)}
                    className={cn(
                      'px-4 py-3 font-semibold transition-colors',
                      col.sortable && 'cursor-pointer hover:text-text-primary hover:bg-surface-hover/70',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.headerClassName
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        alignClass(col.align)
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-text-muted shrink-0">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-accent" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: loadingRowsCount }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {selectable && (
                    <td className="px-3 py-3 text-center">
                      <div className="w-4 h-4 bg-surface-sunken rounded mx-auto" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4', compact ? 'py-2' : 'py-3.5')}
                    >
                      <div className="h-4 bg-surface-sunken dark:bg-surface-raised rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  {emptyState || (
                    <EmptyState
                      icon={Inbox}
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const rowKey = keyExtractor(row, rIdx);
                const isSelected =
                  selectedRowId === rowKey || selectedRowIds.includes(rowKey);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'transition-colors',
                      isSelected
                        ? 'bg-accent-subtle/80 hover:bg-accent-subtle'
                        : 'hover:bg-surface-hover/70',
                      onRowClick && 'cursor-pointer',
                      rIdx % 2 === 1 && !isSelected ? 'bg-surface-raised/20' : ''
                    )}
                  >
                    {selectable && (
                      <td
                        className="w-10 px-3 py-3 text-center"
                        onClick={(e) => handleSelectRow(row, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          aria-label={`Select row ${rIdx + 1}`}
                          className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 text-text-primary text-xs sm:text-sm',
                          compact ? 'py-2' : 'py-3.5',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.className
                        )}
                      >
                        {renderCellValue(col, row, rIdx)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (< sm) */}
      <div className="block sm:hidden divide-y divide-border">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton variant="block" height={100} />
            <Skeleton variant="block" height={100} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-6 text-center">
            {emptyState || (
              <EmptyState
                icon={Inbox}
                title={emptyTitle}
                description={emptyDescription}
              />
            )}
          </div>
        ) : (
          data.map((row, rIdx) => {
            const rowKey = keyExtractor(row, rIdx);
            const isSelected =
              selectedRowId === rowKey || selectedRowIds.includes(rowKey);

            if (mobileCardRender) {
              return (
                <div
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'p-3.5 transition-colors',
                    isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-hover',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {mobileCardRender(row, rIdx)}
                </div>
              );
            }

            return (
              <div
                key={rowKey}
                onClick={() => onRowClick && onRowClick(row)}
                className={cn(
                  'p-4 space-y-2 transition-colors',
                  isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-hover',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {selectable && (
                  <div
                    className="flex items-center justify-between pb-2 border-b border-border/50"
                    onClick={(e) => handleSelectRow(row, e)}
                  >
                    <span className="text-xs text-text-muted font-medium">Select</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-border text-accent focus:ring-accent w-4 h-4"
                    />
                  </div>
                )}
                {columns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-text-muted font-medium">{col.header}:</span>
                    <span className="text-text-primary font-medium text-right ml-2">
                      {renderCellValue(col, row, rIdx)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Built-in Pagination Footer */}
      {pagination && pagination.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface-raised/40 text-xs text-text-secondary select-none">
          <div className="flex items-center gap-3">
            <span>
              Showing{' '}
              <strong className="text-text-primary font-semibold">
                {Math.min(
                  (pagination.page - 1) * pagination.pageSize + 1,
                  pagination.totalItems
                )}
              </strong>{' '}
              to{' '}
              <strong className="text-text-primary font-semibold">
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.totalItems
                )}
              </strong>{' '}
              of{' '}
              <strong className="text-text-primary font-semibold">
                {pagination.totalItems}
              </strong>{' '}
              results
            </span>

            {pagination.onPageSizeChange && (
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-text-muted">|</span>
                <span>Rows:</span>
                <select
                  aria-label="Rows per page"
                  value={pagination.pageSize}
                  onChange={(e) =>
                    pagination.onPageSizeChange &&
                    pagination.onPageSizeChange(Number(e.target.value))
                  }
                  className="h-7 px-2 text-xs rounded bg-surface-base border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {(pagination.pageSizeOptions || [10, 25, 50, 100]).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Prev
            </Button>
            <span className="px-2 py-1 text-xs font-semibold text-text-primary">
              Page {pagination.page} of{' '}
              {Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.page >=
                  Math.ceil(pagination.totalItems / pagination.pageSize) ||
                isLoading
              }
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
