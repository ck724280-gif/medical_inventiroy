'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type SkeletonVariant = 'line' | 'block' | 'circle' | 'table-row';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  rows?: number;
  columns?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'block',
      width,
      height,
      rows = 1,
      columns = 4,
      style,
      ...props
    },
    ref
  ) => {
    const baseShimmer =
      'animate-pulse motion-reduce:animate-none bg-surface-sunken dark:bg-surface-raised rounded';

    if (variant === 'table-row') {
      return (
        <div
          ref={ref}
          role="status"
          aria-label="Loading table data"
          className={cn('w-full flex flex-col space-y-2.5', className)}
          {...props}
        >
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="flex items-center gap-3 w-full py-2">
              {Array.from({ length: columns }).map((_, cIdx) => (
                <div
                  key={cIdx}
                  className={cn(
                    baseShimmer,
                    'h-4 flex-1 rounded',
                    cIdx === 0 && 'w-1/4 flex-none',
                    cIdx === columns - 1 && 'w-16 flex-none'
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'line' && rows > 1) {
      return (
        <div
          ref={ref}
          role="status"
          aria-label="Loading text"
          className={cn('w-full flex flex-col space-y-2', className)}
          {...props}
        >
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                baseShimmer,
                'h-3.5 rounded',
                idx === rows - 1 ? 'w-3/4' : 'w-full'
              )}
              style={idx === rows - 1 && width ? { width } : undefined}
            />
          ))}
        </div>
      );
    }

    const variantStyles: Record<SkeletonVariant, string> = {
      line: 'h-4 w-full rounded',
      block: 'h-24 w-full rounded-lg',
      circle: 'h-10 w-10 rounded-full shrink-0',
      'table-row': 'h-6 w-full rounded',
    };

    const computedStyle: React.CSSProperties = {
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...style,
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading..."
        className={cn(baseShimmer, variantStyles[variant], className)}
        style={computedStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
