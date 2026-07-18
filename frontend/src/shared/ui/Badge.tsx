import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  danger:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  info:    'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  neutral: 'bg-theme-surface border border-default text-muted',
};

export function Badge({ children, variant = 'neutral', className }: Readonly<BadgeProps>) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', variantStyles[variant], className)}>
      {children}
    </span>
  );
}
