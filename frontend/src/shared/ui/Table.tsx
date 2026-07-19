'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
  isRowActive?: (row: T) => boolean;
}

export function Table<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No hay datos disponibles.',
  onRowClick,
  rowKey,
  className,
  isRowActive,
}: Readonly<TableProps<T>>) {
  const renderCellContent = (row: T, col: Column<T>, index: number) => {
    if (col.render) return col.render(row, index);
    const val = (row as Record<string, unknown>)[col.key];
    if (val === null || val === undefined) return '-';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') return val.toString();
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return '-';
      }
    }
    return '-';
  };

  const renderBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={columns.length} className="py-10 text-center text-muted">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cargando...
            </div>
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length} className="py-10 text-center text-theme-faint">
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return data.map((row, index) => (
      <tr
        key={rowKey ? rowKey(row, index) : index}
        onClick={() => onRowClick?.(row)}
        data-active={isRowActive?.(row) ? 'true' : 'false'}
        className={cn(
          'border-t border-default transition-colors duration-150',
          onRowClick && 'cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20',
          isRowActive?.(row) 
            ? 'bg-green-100/40 dark:bg-green-900/20 border-l-4 border-l-green-500'
            : 'even:bg-theme-surface'
        )}
      >
        {columns.map((col) => (
          <td key={`${rowKey ? rowKey(row, index) : index}-${col.key}`} className={cn('px-4 py-3 text-main', col.className)}>
            {renderCellContent(row, col, index)}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-strong bg-card shadow-card', className)}>
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-strong">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-semibold tracking-wide first:rounded-tl-xl last:rounded-tr-xl',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderBody()}
        </tbody>
      </table>
    </div>
  );
}
