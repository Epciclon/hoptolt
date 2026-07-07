'use client';

import { useState } from 'react';
import { Dialog, Button } from '@/shared/ui';
import { Activity, Info } from 'lucide-react';
import { Rabbit } from '../types/rabbit.types';
import { RabbitGrowthHistory } from '@/modules/growth/components/RabbitGrowthHistory';

interface RabbitDetailsModalProps {
  open: boolean;
  onClose: () => void;
  rabbit: Rabbit | null;
}

export function RabbitDetailsModal({
  open,
  onClose,
  rabbit,
}: RabbitDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');

  if (!rabbit) return null;

  return (
    <Dialog open={open} onClose={onClose} title={`Detalles: ${rabbit.code} - ${rabbit.name || 'Sin Nombre'}`} size="xl">
      <div className="flex flex-col h-full bg-white">
        <div className="border-b border-slate-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Info size={16} />
              Información General
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'medical'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Activity size={16} />
              Historial Médico
            </button>
          </nav>
        </div>

        <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center pb-2">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-4 border-white shadow-md mb-3">
                  {rabbit.imageUrl ? (
                    <img src={rabbit.imageUrl} alt={rabbit.name || rabbit.code} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-slate-400 font-medium">Sin foto</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{rabbit.name || 'Sin nombre'}</h3>
                <span className="text-sm text-slate-500 font-medium">{rabbit.code}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Datos Principales</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Género:</span>
                      <span className="font-medium text-slate-800 capitalize">{rabbit.sex}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Raza:</span>
                      <span className="font-medium text-slate-800 capitalize">{rabbit.race}</span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-slate-500">Propósito:</span>
                      <span className="font-medium text-slate-800 capitalize">{rabbit.purpose}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Biometría</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Edad:</span>
                      <span className="font-medium text-slate-800">{rabbit.age !== null && rabbit.age !== undefined ? rabbit.age : 0} meses</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Peso Actual:</span>
                      <span className="font-medium text-slate-800">{rabbit.weight} kg</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Fecha de Nacimiento:</span>
                      <span className="font-medium text-slate-800">{rabbit.birthDate ? new Date(rabbit.birthDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
              <RabbitGrowthHistory rabbitId={rabbit.id} />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end bg-slate-50 mt-auto">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
