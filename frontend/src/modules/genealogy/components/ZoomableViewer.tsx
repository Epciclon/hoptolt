'use client';

import React, { useRef, useState, MouseEvent as ReactMouseEvent } from 'react';
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
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.2));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-[500px] border border-slate-200 rounded-lg bg-slate-100 overflow-hidden flex flex-col">
      {/* Barra de herramientas */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white p-2 rounded-lg shadow-lg border border-slate-200">
        <Button variant="outline" size="sm" icon={<ZoomOut size={16} />} onClick={handleZoomOut} title="Alejar" />
        <div className="flex items-center justify-center w-12 text-sm font-semibold text-slate-600">
          {Math.round(scale * 100)}%
        </div>
        <Button variant="outline" size="sm" icon={<ZoomIn size={16} />} onClick={handleZoomIn} title="Acercar" />
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <Button variant="outline" size="sm" icon={<Maximize size={16} />} onClick={handleReset} title="Restablecer vista" />
      </div>

      {/* Visor interactivo */}
      <div 
        role="presentation"
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ touchAction: 'none' }} // Prevenir scroll en móviles al arrastrar
      >
        <div 
          className="origin-top transition-transform duration-100 ease-out flex justify-center pt-8"
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
