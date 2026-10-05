import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  message?: string;
}

export function FullScreenLoader({ message = 'Cargando...' }: Readonly<FullScreenLoaderProps>) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
      <div className="bg-card px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-main">{message}</h3>
        <p className="text-sm text-muted mt-2 text-center max-w-[250px]">
          Por favor espera mientras preparamos la información.
        </p>
      </div>
    </div>
  );
}
