'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: Readonly<ToastProps>) {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'info':
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={cn('flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border shadow-lg w-full sm:w-auto sm:min-w-80 max-w-full sm:max-w-md animate-in fade-in slide-in-from-top-2 sm:slide-in-from-right duration-200', getStyles())}>
      {getIcon()}
      <p className="flex-1 text-sm font-medium whitespace-pre-wrap">{toast.message}</p>
      <button type="button"
        onClick={() => onClose(toast.id)}
        className="text-current opacity-60 hover:opacity-100 transition-opacity p-1 shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
