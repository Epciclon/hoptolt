'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useDeworming } from '../hooks/useDeworming';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface DewormingCatalogProps {
  onSuccess?: () => void;
}

export function DewormingCatalog({ onSuccess }: DewormingCatalogProps) {
  const { assignedRabbits, dewormingPeriod, loading, createDeworming, dewormings } = useDeworming();

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
    return <p className="text-center text-slate-500 py-8">Cargando datos de desparasitación...</p>;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cageGroups.map(group => (
            <div
              key={group.cageNumber}
              className="border rounded-lg overflow-hidden bg-white"
            >
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800">
                  Jaula #{group.cageNumber} — {group.cageType.charAt(0).toUpperCase() + group.cageType.slice(1)}
                </h4>
              </div>
              <div className="p-3 space-y-2">
                {group.rabbits.map(rabbit => {
                  const isSelected = selectedRabbitIds.includes(rabbit.id);
                  const lastDeworming = getRabbitLastDeworming(rabbit.id);
                  return (
                    <div
                      key={rabbit.id}
                      onClick={() => toggleRabbit(rabbit.id)}
                      className={`p-2 rounded border transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {rabbit.code}{rabbit.name ? ` — ${rabbit.name}` : ''}
                      </p>
                      {isSelected && (
                        <>
                          <p className="text-xs text-slate-500 mt-1">
                            {rabbit.age} meses • {rabbit.weight}kg
                          </p>
                          {lastDeworming && (
                            <div className="pt-2 border-t border-slate-100 mt-2">
                              <p className="text-xs font-semibold text-slate-600">
                                Última desparasitación:
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDateTime(lastDeworming.dewormingDate)}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-200">
        <Button 
          onClick={handleRegister}
          disabled={selectedRabbitIds.length === 0}
        >
          Registrar Desparasitación ({selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  );
}
