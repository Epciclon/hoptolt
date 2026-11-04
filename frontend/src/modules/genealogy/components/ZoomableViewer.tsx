'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/shared/ui';

interface ZoomableViewerProps {
  children: React.ReactNode;
}

export function ZoomableViewer({ children }: Readonly<ZoomableViewerProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setScale(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.3));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const factor = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(prev => Math.min(Math.max(Number((prev + factor).toFixed(2)), 0.3), 2.5));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 40;
      if (e.key === 'ArrowUp') { e.preventDefault(); setPosition(p => ({ ...p, y: p.y + step })); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setPosition(p => ({ ...p, y: p.y - step })); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPosition(p => ({ ...p, x: p.x + step })); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setPosition(p => ({ ...p, x: p.x - step })); }
      if (e.key === '+') { e.preventDefault(); handleZoomIn(); }
      if (e.key === '-') { e.preventDefault(); handleZoomOut(); }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-[520px] sm:h-[580px] border border-strong rounded-xl bg-theme-surface overflow-hidden flex flex-col select-none">
      {/* Barra de herramientas compacta y responsiva */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center gap-1 sm:gap-2 bg-card/95 backdrop-blur-sm p-1 sm:p-1.5 rounded-xl shadow-lg border border-strong">
        <Button
          variant="outline"
          size="sm"
          icon={<ZoomOut size={15} />}
          onClick={handleZoomOut}
          title="Alejar"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
        />
        <div className="flex items-center justify-center min-w-[36px] sm:w-12 text-xs sm:text-sm font-semibold text-main">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<ZoomIn size={15} />}
          onClick={handleZoomIn}
          title="Acercar"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
        />
        <div className="w-px h-5 bg-default mx-0.5 sm:mx-1" />
        <Button
          variant="outline"
          size="sm"
          icon={<Maximize size={15} />}
          onClick={handleReset}
          title="Restablecer vista"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
        />
      </div>

      {/* Visor interactivo con Pointer Events para mouse y táctil */}
      <div
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} focus:outline-none touch-none`}
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <div 
          className="origin-top transition-transform duration-75 ease-out flex justify-center pt-14 sm:pt-16 pb-20"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: '100%',
            height: '100%'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
