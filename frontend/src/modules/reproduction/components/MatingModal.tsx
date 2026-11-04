'use client';

import { useState, useEffect } from 'react';
import { Button, Dialog, ConfirmDialog, RabbitAvatar, Alert } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { reproductionService } from '../services/reproduction.service';
import { genealogyService } from '@/modules/genealogy/services/genealogy.service';
import type { MatingRabbit } from '../types/reproduction.types';
import { HeartHandshake, Search, X } from 'lucide-react';
import { matchesSmartSearch } from '@/shared/utils/rabbitUtils';

interface MatingModalProps {
  male: MatingRabbit;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatingModal({ male, onClose, onSuccess }: Readonly<MatingModalProps>) {
  const [females, setFemales] = useState<MatingRabbit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmFemale, setConfirmFemale] = useState<MatingRabbit | null>(null);
  const [showConsanguinityWarning, setShowConsanguinityWarning] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchFemales = async () => {
      try {
        setLoading(true);
        const data = await reproductionService.getAvailableFemalesForMating(male.id);
        setFemales(data);
      } catch (error) {
        console.error(error);
        showToast('Error al buscar hembras compatibles', 'error');
      } finally {
        setLoading(false);
      }
    };
    void fetchFemales();
  }, [male.id, showToast]);

  const handlePreConfirm = async () => {
    if (!confirmFemale) return;
    setProcessingId(confirmFemale.id);
    try {
      const areRelated = await genealogyService.checkConsanguinity(male.id, confirmFemale.id);
      if (areRelated) {
        setShowConsanguinityWarning(true);
        setProcessingId(null);
      } else {
        await executeMating();
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al verificar consanguinidad.', 'error');
      setProcessingId(null);
    }
  };

  const executeMating = async () => {
    if (!confirmFemale) return;
    setProcessingId(confirmFemale.id);
    try {
      await reproductionService.startMating({ maleId: male.id, femaleId: confirmFemale.id });
      showToast('¡Monta iniciada exitosamente! La coneja ahora está con el macho.', 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.message || 'Error al iniciar la monta', 'error');
    } finally {
      setProcessingId(null);
      setConfirmFemale(null);
      setShowConsanguinityWarning(false);
    }
  };

  const filteredFemales = females.filter(female => {
    return matchesSmartSearch(search, female.cageNumber, female.code, female.name);
  });

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      );
    }
    
    if (females.length === 0) {
      return (
        <Alert 
          variant="warning" 
          message={`No se encontraron hembras receptivas de raza ${male.race} con jaula asignada y edad mayor a 4 meses.`}
          className="my-4"
        />
      );
    }

    return (
      <>
        <div className="relative w-full mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-faint">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-9 py-2 bg-theme-surface dark:bg-slate-900 text-main dark:text-slate-100 border border-default rounded-lg text-sm transition-colors placeholder:text-theme-faint placeholder:truncate focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            placeholder="Buscar hembra por código, nombre o jaula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-theme-faint hover:text-muted rounded-full transition-colors flex items-center justify-center cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {filteredFemales.length === 0 ? (
          <p className="text-sm text-center text-muted py-8 bg-theme-surface rounded-xl border border-default">
            No se encontraron hembras que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto overflow-x-hidden p-1">
            {filteredFemales.map(female => (
              <div
                key={female.id}
                className="border border-strong bg-card hover:border-primary-400 rounded-xl p-3.5 transition-all flex flex-col items-center text-center shadow-xs group"
              >
                {/* Imagen / Avatar arriba */}
                <div className="mb-2.5">
                  <RabbitAvatar imageUrl={female.imageUrl} alt={female.code} size="lg" ring className="transition-transform group-hover:scale-105" />
                </div>

                {/* Datos del conejo: Nombre primero, luego Código y Jaula */}
                <div className="min-w-0 w-full mb-3 flex flex-col items-center">
                  <h5 className="font-bold text-main text-sm truncate max-w-full leading-tight">
                    {female.name ? female.name : female.code}
                  </h5>
                  {female.name && (
                    <span className="text-xs text-muted font-medium mt-0.5 truncate max-w-full">
                      {female.code}
                    </span>
                  )}
                  <div className="mt-1.5 flex items-center justify-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-theme-surface border border-default text-muted">
                      Jaula {female.cageNumber}
                    </span>
                    {female.race && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-theme-surface border border-default text-muted capitalize">
                        {female.race}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón Vincular abajo ocupando todo el ancho */}
                <Button 
                  variant="primary" 
                  size="sm"
                  icon={<HeartHandshake size={15} />}
                  loading={processingId === female.id}
                  disabled={processingId !== null}
                  onClick={() => setConfirmFemale(female)}
                  className="w-full justify-center text-xs py-2 mt-auto"
                >
                  Vincular
                </Button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <Dialog open={true} onClose={onClose} title="Seleccionar Hembra para Monta" size="3xl">
      <div className="mb-4 bg-theme-surface border border-strong rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center sm:items-start text-center sm:text-left min-w-0">
        <RabbitAvatar imageUrl={male.imageUrl} alt={male.code} size="lg" ring className="shrink-0" />
        <div className="min-w-0 flex-1 w-full">
          <h4 className="font-bold text-main text-base sm:text-lg break-words leading-snug">
            {male.name ? `${male.name} - ${male.code}` : male.code}
          </h4>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs sm:text-sm text-muted mt-1">
            <span>Raza: <strong className="font-semibold text-main capitalize">{male.race}</strong></span>
            <span className="opacity-40">•</span>
            <span>Jaula: <strong className="font-semibold text-main">{male.cageNumber}</strong></span>
          </div>
          <p className="text-xs text-theme-faint mt-1.5 leading-relaxed">
            Solo se muestran hembras receptivas mayores a 4 meses de la misma raza.
          </p>
        </div>
      </div>

      {renderContent()}
      {confirmFemale && !showConsanguinityWarning && (
        <ConfirmDialog
          open={!!confirmFemale && !showConsanguinityWarning}
          onClose={() => setConfirmFemale(null)}
          onConfirm={handlePreConfirm}
          loading={processingId !== null}
          title="Confirmar Monta"
          description={<>¿Estás seguro de que deseas vincular a la hembra <b>{confirmFemale.name ? `${confirmFemale.name} - ${confirmFemale.code}` : confirmFemale.code}</b> con el macho <b>{male.name ? `${male.name} - ${male.code}` : male.code}</b>?</>}
          confirmLabel="Sí, vincular"
          variant="primary"
        />
      )}

      {showConsanguinityWarning && (
        <Dialog open={true} onClose={() => setShowConsanguinityWarning(false)} title="ADVERTENCIA: Parentesco Detectado" size="md">
          <div className="flex flex-col gap-4 text-main">
            <div className="bg-theme-surface border border-strong text-main p-4 rounded-lg flex gap-3">
              <div className="text-sm">
                <p className="mb-2"><b>El cruce de conejos de la misma familia puede causar problemas de salud en las crías.</b></p>
                <p>Lo ideal es cruzar conejos sin ningún parentesco cercano en su árbol genealógico. Esta práctica ayuda a mantener crías fuertes y asegura camadas grandes y sanas.</p>
              </div>
            </div>
            <p className="text-sm">¿Deseas proceder de todos modos con esta monta y asumir los riesgos?</p>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowConsanguinityWarning(false)}>
                Cancelar Monta
              </Button>
              <Button variant="danger" onClick={executeMating} loading={processingId !== null}>
                Proceder de todos modos
              </Button>
            </div>
          </div>
        </Dialog>
      )}
  </Dialog>
  );
}
