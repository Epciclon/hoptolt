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
    <div className={cn("flex items-center justify-between sm:justify-center gap-4 py-4 mt-2", className)}>
      <Button
        variant="outline"
        size="md"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft size={16} className="-ml-1" />
        Anterior
      </Button>
      
      <span className="text-sm text-slate-600 font-medium">
        Página {currentPage} de {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="md"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Siguiente
        <ChevronRight size={16} className="-mr-1" />
      </Button>
    </div>
  );
}
