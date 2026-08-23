'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Standalone listener for imperative `toast.success(...)` calls outside React Context
type ToastListener = (toast: ToastItem) => void;
const toastListeners = new Set<ToastListener>();

export const toast = {
  show: (t: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fullToast: ToastItem = { ...t, id };
    toastListeners.forEach((fn) => fn(fullToast));
    return id;
  },
  success: (message: string, title?: string, duration?: number) =>
    toast.show({ message, title, variant: 'success', duration }),
  error: (message: string, title?: string, duration?: number) =>
    toast.show({ message, title, variant: 'error', duration }),
  warning: (message: string, title?: string, duration?: number) =>
    toast.show({ message, title, variant: 'warning', duration }),
  info: (message: string, title?: string, duration?: number) =>
    toast.show({ message, title, variant: 'info', duration }),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = { ...t, id };
      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  React.useEffect(() => {
    const listener: ToastListener = (t) => {
      setToasts((prev) => [...prev, t]);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const success = React.useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, variant: 'success', duration }),
    [showToast]
  );
  const error = React.useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, variant: 'error', duration }),
    [showToast]
  );
  const warning = React.useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, variant: 'warning', duration }),
    [showToast]
  );
  const info = React.useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, variant: 'info', duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    // Fallback to standalone toast object if rendered outside Provider
    return {
      toasts: [],
      showToast: toast.show,
      dismissToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
    };
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>,
    document.body
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const duration = toast.duration ?? 4000;
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  const variantIcons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-status-success shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-status-error shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-status-warning shrink-0" />,
    info: <Info className="w-5 h-5 text-status-info shrink-0" />,
  };

  const variantBorder: Record<ToastVariant, string> = {
    success: 'border-status-success-border',
    error: 'border-status-error-border',
    warning: 'border-status-warning-border',
    info: 'border-status-info-border',
  };

  const variantProgress: Record<ToastVariant, string> = {
    success: 'bg-status-success',
    error: 'bg-status-error',
    warning: 'bg-status-warning',
    info: 'bg-status-info',
  };

  const v = toast.variant || 'info';

  return (
    <div
      role={v === 'error' ? 'alert' : 'status'}
      className={cn(
        'relative overflow-hidden pointer-events-auto rounded-xl bg-surface-overlay border shadow-lg p-3.5 flex items-start gap-3',
        'animate-fade-slide-up transition-all',
        variantBorder[v]
      )}
    >
      {variantIcons[v]}

      <div className="flex-1 min-w-0 pr-2">
        {toast.title && (
          <h5 className="text-xs font-semibold text-text-primary leading-tight mb-0.5">
            {toast.title}
          </h5>
        )}
        <p className="text-xs text-text-secondary leading-normal">{toast.message}</p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Auto-dismiss progress bar */}
      {duration > 0 && (
        <div
          className={cn(
            'absolute bottom-0 left-0 h-0.5 transition-all linear',
            variantProgress[v]
          )}
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
}
