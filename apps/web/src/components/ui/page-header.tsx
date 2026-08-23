'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      className,
      title,
      description,
      breadcrumbs,
      actions,
      badge,
      backHref,
      onBack,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 pb-5 border-b border-border/70 mb-6 select-none',
          className
        )}
        {...props}
      >
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-muted">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-text-disabled shrink-0" />}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-text-primary transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'truncate max-w-[120px] sm:max-w-[200px]',
                        isLast ? 'text-text-primary font-medium' : ''
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {/* Title, Badge, Back Button and Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {backHref && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 shrink-0 -ml-1">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            )}
            {onBack && !backHref && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="w-8 h-8 p-0 shrink-0 -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {typeof title === 'string' ? (
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                    {title}
                  </h1>
                ) : (
                  title
                )}
                {badge && <div className="shrink-0">{badge}</div>}
              </div>

              {description && (
                <div className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  {description}
                </div>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2 sm:self-center shrink-0 flex-wrap">
              {actions}
            </div>
          )}
        </div>

        {children}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';
