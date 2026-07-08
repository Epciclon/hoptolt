'use client';

import { cn } from '@/lib/utils';

interface ImagePlaceholderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-32 w-32',
  md: 'h-48 w-48',
  lg: 'h-64 w-full',
};

export function ImagePlaceholder({ className, size = 'md' }: Readonly<ImagePlaceholderProps>) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg',
        sizeStyles[size],
        className
      )}
    >
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-slate-500 font-medium">No Imagen</p>
      </div>
    </div>
  );
}
