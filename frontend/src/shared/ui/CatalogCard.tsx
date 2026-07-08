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
}: Readonly<CatalogCardProps>) {
  return (
    <div
      className={`group relative flex flex-col border rounded-lg overflow-hidden transition-all duration-200 text-left w-full ${
        isSelected 
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500 ring-opacity-50' 
          : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-md'
      }`}
    >
      {/* Invisible button for full-card click accessibility without nested buttons */}
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          aria-label="Seleccionar tarjeta"
        />
      )}

      {/* 1. Imagen a full-width en la parte superior */}
      <div className="relative z-10 w-full h-56 bg-slate-50 border-b border-slate-100 flex-shrink-0 overflow-hidden pointer-events-none">
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
          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded shadow-sm pointer-events-auto">
            {badge}
          </div>
        )}
        {topRightAction && (
          <div className="absolute top-2 right-2 pointer-events-auto">
            {topRightAction}
          </div>
        )}
      </div>

      {/* 2. Textos centrados debajo */}
      <div className="p-4 flex flex-col flex-grow items-center text-center relative z-10 pointer-events-none">
        <h4 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{title}</h4>
        
        {subtitle && (
          <div className="text-sm text-slate-500 font-medium mb-3">{subtitle}</div>
        )}
        
        {tags && (
          <div className="flex flex-wrap gap-2 justify-center mb-4 pointer-events-auto">
            {tags}
          </div>
        )}

        {details && (
          <div className="flex gap-4 text-xs text-slate-600 mt-auto bg-slate-100/70 p-2 rounded-md w-full justify-center shadow-inner mb-2 pointer-events-auto">
            {details}
          </div>
        )}

        {/* Botones de acción */}
        {isSelected && actions && (
          <div className={`flex flex-wrap gap-2 w-full pt-4 border-t border-slate-200/60 animate-in fade-in slide-in-from-bottom-2 duration-200 justify-center pointer-events-auto ${!details ? 'mt-auto' : ''}`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
