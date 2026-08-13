'use client';

import { useState, useEffect } from 'react';
import { Dialog, Button, RabbitAvatar } from '@/shared/ui';
import { Activity, Info } from 'lucide-react';
import { Rabbit } from '../types/rabbit.types';
import { RabbitGrowthHistory } from '@/modules/growth/components/RabbitGrowthHistory';
import { RabbitReproductionHistory } from './RabbitReproductionHistory';

import { RabbitMedicalOverview } from './RabbitMedicalOverview';
import { RabbitReproductionStats } from './RabbitReproductionStats';

interface RabbitDetailsModalProps {
  open: boolean;
  onClose: () => void;
  rabbit: Rabbit | null;
}

export function RabbitDetailsModal({
  open,
  onClose,
  rabbit,
}: Readonly<RabbitDetailsModalProps>) {
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'partos'>('info');

  useEffect(() => {
    if (open) {
      setActiveTab('info');
    }
  }, [open, rabbit?.id]);

  if (!rabbit) return null;

  const showPartosTab = rabbit.sex === 'hembra' && (rabbit.age ?? 0) >= 4;

  return (
    <Dialog open={open} onClose={onClose} title={`Detalles: ${rabbit.code} - ${rabbit.name || 'Sin Nombre'}`} size="xl">
      <div className="flex flex-col h-full bg-card">
        <div className="border-b border-strong">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <button type="button"
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted hover:text-main hover:border-slate-300'
              }`}
            >
              <Info size={16} />
              Información General
            </button>
            <button type="button"
              onClick={() => setActiveTab('medical')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'medical'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted hover:text-main hover:border-slate-300'
              }`}
            >
              <Activity size={16} />
              Historial de Crecimiento
            </button>
            {showPartosTab && (
              <button type="button"
                onClick={() => setActiveTab('partos')}
                className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'partos'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-muted hover:text-main hover:border-slate-300'
                }`}
              >
                <Activity size={16} />
                Partos
              </button>
            )}
          </nav>
        </div>

        <div className="p-6 bg-theme-surface flex-1 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center pb-2">
                  <RabbitAvatar imageUrl={rabbit.imageUrl} alt={rabbit.name || rabbit.code} size="2xl" ring />
                <h3 className="text-xl font-bold text-main">{rabbit.name || 'Sin nombre'}</h3>
                <span className="text-sm text-muted font-medium">{rabbit.code}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-5 rounded-xl border border-strong shadow-sm">
                  <h4 className="text-sm font-semibold text-main mb-4 uppercase tracking-wider">Datos Principales</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-muted">Género:</span>
                      <span className="font-medium text-main capitalize">{rabbit.sex}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-muted">Raza:</span>
                      <span className="font-medium text-main capitalize">{rabbit.race}</span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-muted">Propósito:</span>
                      <span className="font-medium text-main capitalize">{rabbit.purpose}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-5 rounded-xl border border-strong shadow-sm">
                  <h4 className="text-sm font-semibold text-main mb-4 uppercase tracking-wider">Biometría</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-muted">Edad:</span>
                      <span className="font-medium text-main">{rabbit.age ?? 0} meses</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-muted">Peso Actual:</span>
                      <span className="font-medium text-main">{rabbit.weight} kg</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-muted">Fecha de Nacimiento:</span>
                      <span className="font-medium text-main">{rabbit.birthDate ? new Date(rabbit.birthDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {showPartosTab && <RabbitReproductionStats rabbitId={rabbit.id} />}
                  </div>
                </div>
                
                <RabbitMedicalOverview rabbit={rabbit} />
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="bg-card p-6 rounded-xl border border-strong shadow-sm min-h-[300px]">
              <RabbitGrowthHistory rabbitId={rabbit.id} rabbitBirthDate={rabbit.birthDate} />
            </div>
          )}

          {activeTab === 'partos' && showPartosTab && (
            <div className="bg-card p-6 rounded-xl border border-strong shadow-sm min-h-[300px]">
              <RabbitReproductionHistory rabbitId={rabbit.id} />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-strong flex justify-end bg-theme-surface mt-auto">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
