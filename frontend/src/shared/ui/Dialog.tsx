'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  size?: DialogSize;
  hideClose?: boolean;
  centerHeader?: boolean;
}

const sizeMap: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

const openDialogStack: symbol[] = [];

export function Dialog({ open, onClose, title, description, children, size = 'md', hideClose = false, centerHeader = false }: Readonly<DialogProps>) {
  const [mounted, setMounted] = useState(false);
  const [stackIndex, setStackIndex] = useState(0);
  const dialogIdRef = useRef<symbol | null>(null);

  if (!dialogIdRef.current) {
    dialogIdRef.current = Symbol('dialog');
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = dialogIdRef.current!;
    if (open && mounted) {
      if (!openDialogStack.includes(id)) {
        openDialogStack.push(id);
      }
      setStackIndex(openDialogStack.indexOf(id));
    }
    return () => {
      const idx = openDialogStack.indexOf(id);
      if (idx !== -1) {
        openDialogStack.splice(idx, 1);
      }
    };
  }, [open, mounted]);

  useEffect(() => {
    const id = dialogIdRef.current!;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topDialogId = openDialogStack[openDialogStack.length - 1];
        if (!topDialogId || topDialogId === id) {
          e.stopPropagation();
          onClose();
        }
      }
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <dialog
      open
      style={{ zIndex: 999 + stackIndex * 10 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-2.5 sm:p-4 bg-transparent border-none m-0 w-full h-full max-w-none max-h-none"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Cerrar diálogo"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm border-none cursor-default w-full h-full block"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className={cn(
          'relative w-full mx-auto bg-card rounded-2xl shadow-2xl flex flex-col',
          'animate-in fade-in zoom-in-95 duration-200',
          'max-h-[92vh]',
          sizeMap[size],
        )}
      >
        <div className={cn("flex items-start justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-default shrink-0", centerHeader && "text-center")}>
          <div className={cn("min-w-0 flex-1", centerHeader && "text-center")}>
            <h2 className="text-base sm:text-lg font-semibold text-main leading-snug">{title}</h2>
            {description && <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">{description}</p>}
          </div>
          {!hideClose && (
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="ml-4 mt-0.5 text-theme-faint hover:text-muted transition-colors cursor-pointer shrink-0"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto">{children}</div>
      </div>
    </dialog>,
    document.body
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning' | 'primary';
  centerHeader?: boolean;
}

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
  centerHeader = true,
}: Readonly<ConfirmDialogProps>) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="sm" hideClose centerHeader={centerHeader}>
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          loading={loading}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
