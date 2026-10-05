'use client';

import { LoadingMessage, CageGroupGrid, SelectionActionBar } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useToast } from '@/shared/contexts/ToastContext';
import { useDeworming } from '../hooks/useDeworming';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { formatDateTime } from '@/shared/utils/dateUtils';

import { FilterBar } from '@/shared/ui/FilterBar';
import { useState } from 'react';

interface DewormingCatalogProps {
  onSuccess?: () => void;
}

export function DewormingCatalog({ onSuccess }: Readonly<DewormingCatalogProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const { assignedRabbits, dewormingPeriod, loading, createDeworming, dewormings, isCreating } = useDeworming();

  const { showToast } = useToast();
  
  const {
    selectedRabbitIds,
    toggleRabbit,
    paginatedGroups,
    currentPage,
    totalPages,
    setCurrentPage,
    clearSelection
  } = useCageSelection(assignedRabbits, searchTerm);

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


      <div className="p-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-md shadow-sm">
        <p className="text-sm text-sky-800 dark:text-sky-300">
          Período de desparasitación configurado: <strong>{dewormingPeriod} días</strong>
        </p>
      </div>

      <div className="w-full relative z-20 mb-2">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, código o jaula..."
        />
      </div>

      <>
        <CageGroupGrid
          cageGroups={paginatedGroups}
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
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </>

      <SelectionActionBar
        count={selectedRabbitIds.length}
        itemName="conejo"
        buttonText="Registrar Desparasitación"
        onRegister={handleRegister}
        isSubmitting={isCreating}
      />
    </div>
  );
}
