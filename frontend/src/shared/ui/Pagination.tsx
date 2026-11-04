'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}: Readonly<PaginationProps>) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 mt-2", className)}>
      <Button
        variant="outline"
        size="sm"
        className="text-main border-strong shrink-0 px-2 sm:px-3 text-xs sm:text-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        title="Página anterior"
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} className="sm:-ml-0.5" />
        <span className="hidden sm:inline">Anterior</span>
      </Button>
      
      <span className="text-xs sm:text-sm text-main font-semibold px-2.5 py-1 rounded-lg bg-theme-surface border border-default shrink-0 whitespace-nowrap">
        <span className="sm:hidden">{currentPage} / {totalPages}</span>
        <span className="hidden sm:inline">Página {currentPage} de {totalPages}</span>
      </span>
      
      <Button
        variant="outline"
        size="sm"
        className="text-main border-strong shrink-0 px-2 sm:px-3 text-xs sm:text-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        title="Página siguiente"
        aria-label="Página siguiente"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight size={16} className="sm:-mr-0.5" />
      </Button>
    </div>
  );
}
