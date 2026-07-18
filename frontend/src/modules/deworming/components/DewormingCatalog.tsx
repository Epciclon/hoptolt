'use client';

import { Button, LoadingMessage, CageGroupGrid } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useDeworming } from '../hooks/useDeworming';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { formatDateTime } from '@/shared/utils/dateUtils';

interface DewormingCatalogProps {
  onSuccess?: () => void;
}

export function DewormingCatalog({ onSuccess }: Readonly<DewormingCatalogProps>) {
  const { assignedRabbits, dewormingPeriod, loading, createDeworming, dewormings, isCreating } = useDeworming();

  const { showToast } = useToast();
  
  const {
    selectedRabbitIds,
    toggleRabbit,
    selectAllRabbits,
    cageGroups,
    isAllSelected,
    clearSelection
  } = useCageSelection(assignedRabbits);

  const getRabbitLastDeworming = (rabbitId: number) => {
    const rabbitDewormings = dewormings.filter(d => d.rabbitId === rabbitId);
    if (rabbitDewormings.length === 0) return null;
    return rabbitDewormings.sort((a, b) => new Date(b.dewormingDate).getTime() - new Date(a.dewormingDate).getTime())[0];
  };

  const handleRegister = () => {
    if (selectedRabbitIds.length === 0) {
      showToast('Selecciona al menos un conejo.', 'error');
      return;
    }

    submitDeworming();
  };

  const submitDeworming = async () => {


    try {
      await createDeworming({
        rabbitIds: selectedRabbitIds,
      });
      showToast('Desparasitación registrada exitosamente.', 'success');
      clearSelection();
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado.';
      // Contar cuántos conejos tienen problemas (líneas que empiezan con "El conejo")
      const errorLines = errorMessage.split('\n').filter(line => line.trim().startsWith('El conejo'));
      const hasValidRabbits = errorLines.length < selectedRabbitIds.length;

      if (hasValidRabbits) {
        showToast(`${errorMessage}\n\nPor favor, deselecciona los conejos con problemas mencionados arriba para registrar los demás.`, 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  if (loading) {
    return <LoadingMessage message="Cargando desparasitaciones..." />;
  }

  return (
    <div className="flex flex-col gap-4">


      <div className="p-3 bg-sky-50 border border-sky-200 rounded-md shadow-sm">
        <p className="text-sm text-sky-800">
          Período de desparasitación configurado: <strong>{dewormingPeriod} días</strong>
        </p>
      </div>

      <CageGroupGrid
        cageGroups={cageGroups}
        selectedRabbitIds={selectedRabbitIds}
        onToggleRabbit={toggleRabbit}
        renderExtras={(rabbit) => {
          const lastDeworming = getRabbitLastDeworming(rabbit.id);
          return (
            <>
              <p className="text-[10px] text-muted mb-0.5">Última desparasitación:</p>
              <p className="text-xs font-medium text-main truncate" title={lastDeworming ? formatDateTime(lastDeworming.dewormingDate) : 'Nunca'}>
                {lastDeworming ? formatDateTime(lastDeworming.dewormingDate) : 'Nunca'}
              </p>
            </>
          );
        }}
      />

      {selectedRabbitIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 shadow-xl border-2 border-primary-500 bg-theme-surface p-3 rounded-2xl flex items-center justify-between gap-6 max-w-[90vw] min-w-[300px]">
          <span className="text-main font-semibold px-2">{selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''} seleccionado{selectedRabbitIds.length !== 1 ? 's' : ''}</span>
          <Button
            onClick={handleRegister}
            disabled={selectedRabbitIds.length === 0}
            loading={isCreating}
            variant="primary"
          >
            Registrar Desparasitación
          </Button>
        </div>
      )}
    </div>
  );
}
