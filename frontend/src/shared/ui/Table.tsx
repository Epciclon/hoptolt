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
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card', className)}>
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="bg-sidebar text-white">
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
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cargando...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={rowKey ? rowKey(row, index) : index}
                onClick={() => onRowClick?.(row)}
                data-active={isRowActive?.(row) ? 'true' : 'false'}
                className={cn(
                  'border-t border-slate-100 transition-colors duration-150',
                  onRowClick && 'cursor-pointer hover:bg-primary-50',
                  isRowActive?.(row) 
                    ? 'bg-green-100/40 border-l-4 border-l-green-500'
                    : 'even:bg-slate-50/50'
                )}
              >
                {columns.map((col) => (
                  <td key={`${rowKey ? rowKey(row, index) : index}-${col.key}`} className={cn('px-4 py-3 text-slate-700', col.className)}>
                    {col.render
                      ? col.render(row, index)
                      : String((row as Record<string, unknown>)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
