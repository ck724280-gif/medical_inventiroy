'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      leftIcon,
      rightIcon,
      disabled,
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const startIcon = leadingIcon || leftIcon;
    const endIcon = trailingIcon || rightIcon;
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-secondary select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {startIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {startIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
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
              'w-full h-9 rounded-lg bg-surface-base border text-sm text-text-primary placeholder:text-text-disabled transition-colors',
              'focus:outline-none focus:ring-2 focus:border-transparent',
              startIcon ? 'pl-9' : 'pl-3',
              endIcon || hasError ? 'pr-9' : 'pr-3',
              hasError
                ? 'border-status-error focus:ring-status-error/30 text-status-error'
                : 'border-border focus:ring-accent/25 focus:border-accent',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-sunken',
              className
            )}
            {...props}
          />

          {hasError && !endIcon ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-status-error">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            endIcon && (
              <div className="absolute right-3 flex items-center text-text-muted">
                {endIcon}
              </div>
            )
          )}
        </div>

        {hasError && errorMessage ? (
          <p id={errorId} className="text-xs text-status-error font-medium flex items-center gap-1">
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

Input.displayName = 'Input';
