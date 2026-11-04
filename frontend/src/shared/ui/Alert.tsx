'use client';

import { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface AlertProps {
  variant: AlertVariant;
  message: string;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { icon: ReactNode; styles: string }> = {
  success: {
    icon: <CheckCircle size={16} />,
    styles: 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  },
  error: {
    icon: <XCircle size={16} />,
    styles: 'bg-red-500/10 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    styles: 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  },
  info: {
    icon: <Info size={16} />,
    styles: 'bg-blue-500/10 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  },
  neutral: {
    icon: <Info size={16} />,
    styles: 'bg-theme-surface border border-default text-main border-strong',
  },
};

export function Alert({ variant, message, onClose, className }: Readonly<AlertProps>) {
  const { icon, styles } = config[variant];

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium', styles, className)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="flex-1 whitespace-pre-line">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
