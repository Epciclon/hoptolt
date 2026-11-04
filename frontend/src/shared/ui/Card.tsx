import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TutorialButton } from './TutorialButton';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  tutorialUrl?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-2.5 sm:p-4',
  md: 'p-3 sm:p-5 md:p-6',
  lg: 'p-4 sm:p-6 md:p-8',
};

export function Card({ children, className, padding = 'md' }: Readonly<CardProps>) {
  return (
    <div className={cn('bg-card rounded-xl shadow-card border border-default', paddingMap[padding], className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, className, tutorialUrl }: Readonly<CardHeaderProps>) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5', className)}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-main leading-tight">{title}</h2>
          {tutorialUrl && <TutorialButton videoUrl={tutorialUrl} />}
        </div>
        {subtitle && <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
