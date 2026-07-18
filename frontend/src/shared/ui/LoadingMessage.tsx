import React from 'react';

interface LoadingMessageProps {
  message?: string;
}

export function LoadingMessage({ message = 'Cargando...' }: Readonly<LoadingMessageProps>) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      <p className="text-muted font-medium">{message}</p>
    </div>
  );
}
