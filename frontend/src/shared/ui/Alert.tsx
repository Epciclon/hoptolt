'use client';

import { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  message: string;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { icon: ReactNode; styles: string }> = {
  success: {
    icon: <CheckCircle size={16} />,
    styles: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  error: {
    icon: <XCircle size={16} />,
    styles: 'bg-red-50 text-red-800 border-red-200',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    styles: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  info: {
    icon: <Info size={16} />,
    styles: 'bg-blue-50 text-blue-800 border-blue-200',
  },
};

export function Alert({ variant, message, onClose, className }: Readonly<AlertProps>) {
  const { icon, styles } = config[variant];

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium', styles, className)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="flex-1 whitespace-pre-line">{message}</span>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
