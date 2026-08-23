'use client';

import * as React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, ButtonVariant } from './button';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: LucideIcon | React.ReactNode;
  title: string | React.ReactNode;
  description?: string;
  action?: React.ReactNode | EmptyStateAction;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, children, ...props }, ref) => {
    const renderIcon = () => {
      if (!icon) {
        return (
          <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-3">
            <Inbox className="w-6 h-6" />
          </div>
        );
      }

      if (typeof icon === 'function' || (typeof icon === 'object' && 'render' in (icon as any))) {
        const IconComponent = icon as LucideIcon;
        return (
          <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-3">
            <IconComponent className="w-6 h-6" />
          </div>
        );
      }

      return (
        <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-3">
          {icon as React.ReactNode}
        </div>
      );
    };

    const renderAction = () => {
      if (!action) return null;

      if (React.isValidElement(action)) {
        return <div className="mt-4">{action}</div>;
      }

      const act = action as EmptyStateAction;
      return (
        <div className="mt-4">
          <Button
            variant={act.variant || 'primary'}
            size="md"
            onClick={act.onClick}
            leftIcon={act.icon}
          >
            {act.label}
          </Button>
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 text-center select-none animate-fade-in',
          className
        )}
        {...props}
      >
        {renderIcon()}
        <h4 className="text-base font-semibold text-text-primary mb-1">{title}</h4>
        {description && (
          <p className="text-xs sm:text-sm text-text-muted max-w-sm mb-1 leading-relaxed">
            {description}
          </p>
        )}
        {children}
        {renderAction()}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
