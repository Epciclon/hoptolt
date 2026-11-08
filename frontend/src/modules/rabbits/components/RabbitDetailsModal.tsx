'use client';

import { useState, useEffect } from 'react';
import { Dialog, Button, RabbitAvatar } from '@/shared/ui';
import { Activity, Info, Pencil, Baby } from 'lucide-react';
import { Rabbit } from '../types/rabbit.types';
import { RabbitGrowthHistory } from '@/modules/growth/components/RabbitGrowthHistory';
import { RabbitReproductionHistory } from './RabbitReproductionHistory';

import { RabbitMedicalOverview } from './RabbitMedicalOverview';
import { RabbitReproductionStats } from './RabbitReproductionStats';

interface RabbitDetailsModalProps {
  open: boolean;
  onClose: () => void;
  rabbit: Rabbit | null;
  onEdit?: (rabbit: Rabbit) => void;
  onlyCurrent?: boolean;
}

export function RabbitDetailsModal({
  open,
  onClose,
  rabbit,
  onEdit,
  onlyCurrent = false,
}: Readonly<RabbitDetailsModalProps>) {
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'partos'>('info');

  useEffect(() => {
    if (open) {
      setActiveTab('info');
    }
  }, [open, rabbit?.id]);

  if (!rabbit) return null;

  const showPartosTab = rabbit.sex === 'hembra' && (rabbit.age ?? 0) >= 4;

  const modalTitle = rabbit.name ? `Detalles: ${rabbit.name} - ${rabbit.code}` : `Detalles: ${rabbit.code}`;

  return (
    <Dialog open={open} onClose={onClose} title={modalTitle} size="xl">
      <div className="flex flex-col h-full w-full bg-card">
        <div className="border-b border-strong">
          <nav className="flex gap-2 sm:gap-4 px-2.5 sm:px-6 overflow-x-auto" aria-label="Tabs">
            <button type="button"
              onClick={() => setActiveTab('info')}
              className={`py-3 sm:py-4 px-1 inline-flex items-center gap-1.5 sm:gap-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-main hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Info size={16} />
              <span className="sm:hidden">General</span>
              <span className="hidden sm:inline">Información General</span>
            </button>
            <button type="button"
              onClick={() => setActiveTab('medical')}
              className={`py-3 sm:py-4 px-1 inline-flex items-center gap-1.5 sm:gap-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'medical'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-main hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Activity size={16} />
              <span className="sm:hidden">Crecimiento</span>
              <span className="hidden sm:inline">{onlyCurrent ? 'Crecimiento Actual' : 'Historial de Crecimiento'}</span>
            </button>
            {showPartosTab && (
              <button type="button"
                onClick={() => setActiveTab('partos')}
                className={`py-3 sm:py-4 px-1 inline-flex items-center gap-1.5 sm:gap-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'partos'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-muted hover:text-main hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Baby size={16} />
                <span className="sm:hidden">Partos</span>
                <span className="hidden sm:inline">{onlyCurrent ? 'Parto Actual' : 'Partos'}</span>
              </button>
            )}
          </nav>
        </div>

        <div className="p-2.5 sm:p-5 bg-theme-surface flex-1 w-full overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col items-center justify-center pb-2 relative">
                <RabbitAvatar imageUrl={rabbit.imageUrl} alt={rabbit.name || rabbit.code} size="2xl" ring disableQuickView />
                <h3 className="text-lg sm:text-xl font-bold text-main mt-2">{rabbit.name || 'Sin nombre'}</h3>
                <span className="text-xs sm:text-sm text-muted font-medium">{rabbit.code}</span>
                {onEdit && (
                   <div className="mt-3 sm:mt-4">
                     <Button type="button" variant="outline" size="sm" icon={<Pencil size={14} />} onClick={() => { onEdit(rabbit); }}>
                       Editar Conejo
                     </Button>
                   </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-card p-3.5 sm:p-5 rounded-xl border border-strong shadow-sm">
                  <h4 className="text-xs sm:text-sm font-semibold text-main mb-3 sm:mb-4 uppercase tracking-wider">Datos Principales</h4>
                  <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-default/50 pb-2">
                      <span className="text-muted">Género:</span>
                      <span className="font-semibold text-main capitalize text-right shrink-0">{rabbit.sex}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-default/50 pb-2">
                      <span className="text-muted">Raza:</span>
                      <span className="font-semibold text-main capitalize text-right shrink-0">{rabbit.race}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1">
                      <span className="text-muted">Propósito:</span>
                      <span className="font-semibold text-main capitalize text-right shrink-0">{rabbit.purpose}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-3.5 sm:p-5 rounded-xl border border-strong shadow-sm">
                  <h4 className="text-xs sm:text-sm font-semibold text-main mb-3 sm:mb-4 uppercase tracking-wider">Biometría</h4>
                  <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-default/50 pb-2">
                      <span className="text-muted">Edad:</span>
                      <span className="font-semibold text-main text-right shrink-0">{rabbit.age ?? 0} {rabbit.age === 1 ? 'mes' : 'meses'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-default/50 pb-2">
                      <span className="text-muted">Peso Actual:</span>
                      <span className="font-semibold text-main text-right shrink-0">{rabbit.weight !== undefined && rabbit.weight !== null ? `${rabbit.weight} kg` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1">
                      <span className="text-muted min-w-0">Fecha de Nacimiento:</span>
                      <span className="font-semibold text-main text-right shrink-0 whitespace-nowrap">
                        {rabbit.birthDate ? new Date(rabbit.birthDate).toLocaleDateString('es-EC') : 'N/A'}
                      </span>
                    </div>
                    {showPartosTab && <RabbitReproductionStats rabbitId={rabbit.id} />}
                  </div>
                </div>
                
                <RabbitMedicalOverview rabbit={rabbit} />
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="w-full min-h-[300px] space-y-4 sm:space-y-6">
              <RabbitGrowthHistory 
                rabbitId={rabbit.id} 
                rabbitBirthDate={rabbit.birthDate}
                rabbitAge={rabbit.age}
                rabbitWeight={rabbit.weight}
                onlyCurrent={onlyCurrent}
              />
            </div>
          )}

          {activeTab === 'partos' && showPartosTab && (
            <div className="w-full min-h-[300px]">
              <RabbitReproductionHistory rabbitId={rabbit.id} onlyCurrent={onlyCurrent} />
            </div>
          )}
        </div>

        <div className="p-3.5 sm:p-5 border-t border-strong flex justify-end bg-theme-surface mt-auto">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
