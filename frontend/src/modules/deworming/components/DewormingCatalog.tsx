'use client';

import { useState } from 'react';
import { Button, CageGroupCard, RabbitSelectableCard, LoadingMessage } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useDeworming } from '../hooks/useDeworming';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface DewormingCatalogProps {
  onSuccess?: () => void;
}

export function DewormingCatalog({ onSuccess }: DewormingCatalogProps) {
  const { assignedRabbits, dewormingPeriod, loading, createDeworming, dewormings, isCreating } = useDeworming();

  const { showToast } = useToast();
  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const formattedDate = ecuadorDate.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${formattedDate} ${formattedTime}`;
  };

  const getRabbitLastDeworming = (rabbitId: number) => {
    const rabbitDewormings = dewormings.filter(d => d.rabbitId === rabbitId);
    if (rabbitDewormings.length === 0) return null;
    return rabbitDewormings.sort((a, b) => new Date(b.dewormingDate).getTime() - new Date(a.dewormingDate).getTime())[0];
  };

  const toggleRabbit = (rabbitId: number) => {
    setSelectedRabbitIds(prev =>
      prev.includes(rabbitId)
        ? prev.filter(id => id !== rabbitId)
        : [...prev, rabbitId]
    );
  };

  const selectAllRabbits = () => {
    setSelectedRabbitIds(assignedRabbits.map(r => r.id));
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
      setSelectedRabbitIds([]);
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

  const groupedByCage = assignedRabbits.reduce((acc, rabbit) => {
    const cageNumber = rabbit.cageNumber || 0;
    const cageId = rabbit.cageId;
    if (!acc[cageNumber]) {
      acc[cageNumber] = {
        cageNumber,
        cageType: rabbit.cageType || 'desconocido',
        cageId: cageId || 0,
        rabbits: []
      };
    }
    acc[cageNumber].rabbits.push(rabbit);
    return acc;
  }, {} as Record<number, { cageNumber: number; cageType: string; cageId: number; rabbits: AssignedRabbit[] }>);

  const cageGroups = Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);

  if (loading) {
    return <LoadingMessage message="Cargando desparasitaciones..." />;
  }

  return (
    <div className="flex flex-col gap-4">


      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          Período de desparasitación configurado: <strong>{dewormingPeriod} días</strong>
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={selectAllRabbits}>
          Seleccionar todos
        </Button>
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-slate-500">No hay conejos con jaula asignada en el galpón activo.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {cageGroups.map(group => (
            <CageGroupCard
              key={group.cageNumber}
              cageNumber={group.cageNumber}
              cageType={group.cageType}
            >
              {group.rabbits.map(rabbit => {
                const isSelected = selectedRabbitIds.includes(rabbit.id);
                const lastDeworming = getRabbitLastDeworming(rabbit.id);
                return (
                  <RabbitSelectableCard
                    key={rabbit.id}
                    rabbit={rabbit}
                    isSelected={isSelected}
                    onClick={() => toggleRabbit(rabbit.id)}
                    extras={
                      <>
                        <p className="text-[10px] text-slate-500 mb-0.5">Última desparasitación:</p>
                        <p className="text-xs font-medium text-slate-700 truncate" title={lastDeworming ? formatDateTime(lastDeworming.dewormingDate) : 'Nunca'}>
                          {lastDeworming ? formatDateTime(lastDeworming.dewormingDate) : 'Nunca'}
                        </p>
                      </>
                    }
                  />
                );
              })}
            </CageGroupCard>
          ))}
        </div>
      )}

      {selectedRabbitIds.length > 0 && (
        <div className="flex justify-end pt-4 mt-6 border-t border-slate-200">
          <Button
            onClick={handleRegister}
            disabled={selectedRabbitIds.length === 0}
            loading={isCreating}
          >
            Registrar Desparasitación ({selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''})
          </Button>
        </div>
      )}
    </div>
  );
}
