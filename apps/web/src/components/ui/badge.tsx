'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotClassName?: string;
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      dotClassName,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center font-medium border select-none transition-colors';

    const variantStyles: Record<BadgeVariant, string> = {
      default:
        'bg-surface-raised text-text-secondary border-border',
      success:
        'bg-status-success-bg text-status-success border-status-success-border',
      warning:
        'bg-status-warning-bg text-status-warning border-status-warning-border',
      error:
        'bg-status-error-bg text-status-error border-status-error-border',
      info:
        'bg-status-info-bg text-status-info border-status-info-border',
      outline:
        'bg-transparent text-text-secondary border-border',
    };

    const dotColors: Record<BadgeVariant, string> = {
      default: 'bg-text-muted',
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      error: 'bg-status-error',
      info: 'bg-status-info',
      outline: 'bg-text-muted',
    };

    const sizeStyles: Record<BadgeSize, string> = {
      sm: 'text-[10px] px-1.5 py-0.5 rounded gap-1 leading-none',
      md: 'text-xs px-2 py-0.5 rounded-md gap-1.5 leading-normal',
      lg: 'text-sm px-2.5 py-1 rounded-lg gap-2 leading-normal',
    };

    const dotSizes: Record<BadgeSize, string> = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {dot && (
          <span
            className={cn('rounded-full shrink-0', dotColors[variant], dotSizes[size], dotClassName)}
          />
        )}
        {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
