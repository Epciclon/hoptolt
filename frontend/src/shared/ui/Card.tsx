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
  sm:   'p-3 sm:p-4',
  md:   'p-4 sm:p-6',
  lg:   'p-6 sm:p-8',
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
    <div className={cn('flex items-start justify-between gap-4 mb-5', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-main">{title}</h2>
          {tutorialUrl && <TutorialButton videoUrl={tutorialUrl} />}
        </div>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
