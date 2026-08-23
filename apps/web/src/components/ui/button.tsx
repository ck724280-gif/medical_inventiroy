'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isBusy = isLoading || loading;
    const isDisabled = disabled || isBusy;

    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base ' +
      'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ' +
      'motion-reduce:transition-none motion-reduce:transform-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm active:scale-[0.98]',
      secondary:
        'bg-surface-raised text-text-primary border border-border hover:bg-surface-hover active:scale-[0.98]',
      ghost:
        'text-text-secondary bg-transparent hover:bg-surface-hover hover:text-text-primary active:scale-[0.98]',
      destructive:
        'bg-status-error text-white hover:opacity-90 shadow-sm active:scale-[0.98]',
      outline:
        'border border-border text-text-primary bg-transparent hover:bg-surface-hover active:scale-[0.98]',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-2.5 text-xs rounded-md gap-1.5',
      md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
      lg: 'h-11 px-5 text-base rounded-xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isBusy ? 'true' : undefined}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
        )}
        {children}
        {!isBusy && rightIcon && (
          <span className="shrink-0 inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
