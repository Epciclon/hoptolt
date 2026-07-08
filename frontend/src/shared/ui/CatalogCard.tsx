import { ReactNode } from 'react';
import Image from 'next/image';
import { ImagePlaceholder } from './ImagePlaceholder';

export interface CatalogCardProps {
  imageUrl?: string | null;
  imageAlt?: string;
  badge?: ReactNode;
  topRightAction?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  tags?: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CatalogCard({
  imageUrl,
  imageAlt = '',
  badge,
  topRightAction,
  title,
  subtitle,
  tags,
  details,
  actions,
  isSelected = false,
  onClick
}: CatalogCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group flex flex-col border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500 ring-opacity-50' 
          : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-md'
      }`}
    >
      {/* 1. Imagen a full-width en la parte superior */}
      <div className="relative w-full h-56 bg-slate-50 border-b border-slate-100 flex-shrink-0 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex justify-center items-center bg-slate-100">
            <ImagePlaceholder size="lg" />
          </div>
        )}
        {badge && (
          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
            {badge}
          </div>
        )}
        {topRightAction && (
          <div className="absolute top-2 right-2">
            {topRightAction}
          </div>
        )}
      </div>

      {/* 2. Textos centrados debajo */}
      <div className="p-4 flex flex-col flex-grow items-center text-center">
        <h4 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{title}</h4>
        
        {subtitle && (
          <div className="text-sm text-slate-500 font-medium mb-3">{subtitle}</div>
        )}
        
        {tags && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {tags}
          </div>
        )}

        {details && (
          <div className="flex gap-4 text-xs text-slate-600 mt-auto bg-slate-100/70 p-2 rounded-md w-full justify-center shadow-inner mb-2">
            {details}
          </div>
        )}

        {/* Botones de acción */}
        {isSelected && actions && (
          <div className={`flex flex-wrap gap-2 w-full pt-4 border-t border-slate-200/60 animate-in fade-in slide-in-from-bottom-2 duration-200 justify-center ${!details ? 'mt-auto' : ''}`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
