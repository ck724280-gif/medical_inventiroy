'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, ButtonVariant } from './button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
  bodyClassName,
  headerClassName,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus?.();
        previousActiveElement.current = null;
      }
      return;
    }

    if (!previousActiveElement.current) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, closeOnEscape]);

  if (!mounted || !isOpen) return null;

  const sizeStyles: Record<ModalSize, string> = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-4xl',
    full: 'md:max-w-6xl',
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        onClick={closeOnOverlayClick ? () => onCloseRef.current() : undefined}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Dialog container: bottom sheet on mobile (< md), centered card on desktop (>= md) */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-h-[90vh] md:max-h-[85vh] flex flex-col',
          'rounded-t-2xl md:rounded-2xl bg-surface-overlay border-t md:border border-border shadow-xl z-10 overflow-hidden',
          'animate-fade-slide-up md:animate-fade-in',
          sizeStyles[size],
          className
        )}
      >
        {/* Mobile handle indicator */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex items-start justify-between p-4 md:p-5 border-b border-border/60 shrink-0',
              headerClassName
            )}
          >
            <div className="space-y-1 pr-6">
              {title && (
                <h3 className="text-base md:text-lg font-semibold text-text-primary leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-muted leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 -mr-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={cn('p-4 md:p-5 overflow-y-auto flex-1', bodyClassName)}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 md:p-5 border-t border-border/60 bg-surface-raised/40 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-status-error" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-status-warning" />;
      case 'primary':
      default:
        return <Info className="w-5 h-5 text-accent" />;
    }
  };

  const buttonVariant: ButtonVariant =
    variant === 'danger' ? 'destructive' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      footer={
        <>
          <Button
            variant="outline"
            size="md"
            disabled={isSubmitting || isLoading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            size="md"
            isLoading={isSubmitting || isLoading}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-surface-raised border border-border shrink-0">
          {getIcon()}
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <p className="text-xs text-text-muted leading-relaxed">{description}</p>
        </div>
      </div>
    </Modal>
  );
}
