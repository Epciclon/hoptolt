import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardGroupProps {
  title: string;
  subtitle?: string;
  items: {
    id: string | number;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
  }[];
  className?: string;
}

export function CardGroup({ title, subtitle, items, className }: Readonly<CardGroupProps>) {
  return (
    <div className={cn('bg-white rounded-xl shadow-card border border-slate-100 p-6', className)}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex flex-col gap-2">
              <div className="flex-1">
                <h3 className="font-medium text-slate-800">{item.title}</h3>
                {item.subtitle && <p className="text-sm text-slate-500">{item.subtitle}</p>}
              </div>
              {item.actions && (
                <div className="flex justify-end mt-2">
                  {item.actions}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-center text-slate-400 py-8">No hay elementos para mostrar</p>
      )}
    </div>
  );
}
