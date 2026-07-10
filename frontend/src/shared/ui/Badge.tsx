import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-emerald-100 text-emerald-700',
  danger:  'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info:    'bg-sky-100 text-sky-700',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({ children, variant = 'neutral', className }: Readonly<BadgeProps>) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', variantStyles[variant], className)}>
      {children}
    </span>
  );
}
