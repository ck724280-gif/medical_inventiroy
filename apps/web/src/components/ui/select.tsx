'use client';

import * as React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  options?: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      helperText,
      error,
      options,
      placeholder,
      icon,
      disabled,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-text-secondary select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {icon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              hasError && errorMessage
                ? errorId
                : helperText
                ? helperId
                : undefined
            }
            className={cn(
              'w-full h-9 rounded-lg bg-surface-base border text-sm text-text-primary appearance-none transition-colors cursor-pointer',
              'focus:outline-none focus:ring-2 focus:border-transparent pr-9',
              icon ? 'pl-9' : 'pl-3',
              hasError
                ? 'border-status-error focus:ring-status-error/30 text-status-error'
                : 'border-border focus:ring-accent/25 focus:border-accent',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-sunken',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 flex items-center pointer-events-none text-text-muted">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {hasError && errorMessage ? (
          <p id={errorId} className="text-xs text-status-error font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
