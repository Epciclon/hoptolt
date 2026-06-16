'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  size?: DialogSize;
  hideClose?: boolean;
}

const sizeMap: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Dialog({ open, onClose, title, description, children, size = 'md', hideClose = false }: DialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl flex flex-col',
          'animate-in fade-in zoom-in-95 duration-200',
          'max-h-[92vh]',
          sizeMap[size],
        )}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {!hideClose && (
            <button
              onClick={onClose}
              className="ml-4 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning' | 'primary';
}

const variantStyles = {
  danger:  'bg-red-500 hover:bg-red-600 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  primary: 'bg-primary-500 hover:bg-primary-600 text-white',
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="sm" hideClose>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60',
            variantStyles[variant],
          )}
        >
          {loading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
