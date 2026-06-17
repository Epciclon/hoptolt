'use client';

import { useState, useEffect } from 'react';
import { Input, Button, Alert, CageCatalog } from '@/shared/ui';
import type { CageItem } from '@/shared/ui';
import { useCleaning } from '../hooks/useCleaning';
import { useToast } from '@/shared/contexts/ToastContext';
import { useAuth } from '@/modules/auth/hooks/useAuth';

interface CleaningFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CleaningForm({ onSuccess, onCancel }: CleaningFormProps) {
  const { user } = useAuth();
  const { assignedRabbits, cleanings, loading, createCleaning } = useCleaning();

  const { showToast } = useToast();
  const [selectedCageNumbers, setSelectedCageNumbers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const getCageLastCleaning = (cageId: number) => {
    const cageCleanings = cleanings.filter(c => c.cageId === cageId);
    if (cageCleanings.length === 0) return null;
    return cageCleanings.sort((a, b) => new Date(b.cleaningDate).getTime() - new Date(a.cleaningDate).getTime())[0];
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
  }, {} as Record<number, CageItem>);

  const cageGroups: CageItem[] = Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);

  const toggleCage = (cageNumber: number) => {
    setSelectedCageNumbers(prev => 
      prev.includes(cageNumber) 
        ? prev.filter(n => n !== cageNumber)
        : [...prev, cageNumber]
    );
  };

  const selectAllCages = () => {
    if (selectedCageNumbers.length === cageGroups.length) {
      setSelectedCageNumbers([]);
    } else {
      setSelectedCageNumbers(cageGroups.map(g => g.cageNumber));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCageNumbers.length === 0) {
      showToast('Selecciona al menos una jaula.', 'error');
      return;
    }


    setSubmitting(true);

    const cageIds: number[] = [];
    for (const cageNumber of selectedCageNumbers) {
      const cage = cageGroups.find(g => g.cageNumber === cageNumber);
      if (cage) {
        cageIds.push(cage.cageId);
      }
    }

    try {
      await createCleaning({
        cageIds
      });
      showToast('Limpieza registrada exitosamente.', 'success');
      setSelectedCageNumbers([]);
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-slate-500 py-8">Cargando datos...</p>;
  }

  return (
    <form onSubmit={handleRegister} className="flex flex-col gap-4">

      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-600">Jaulas con conejos asignados</label>
        <Button type="button" variant="outline" size="sm" onClick={selectAllCages}>
          {selectedCageNumbers.length === cageGroups.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </Button>
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-slate-500">No hay conejos con jaula asignada en el galpón activo.</p>
      ) : (
        <CageCatalog
          cageGroups={cageGroups}
          selectedCageNumbers={selectedCageNumbers}
          onToggleCage={toggleCage}
          renderCageContent={(cage) => {
            const cageLastCleaning = getCageLastCleaning(cage.cageId);
            return (
              <>
                {cageLastCleaning ? (
                  <>
                    <p className="text-xs font-semibold text-slate-600">
                      Última limpieza:
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(cageLastCleaning.cleaningDate)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Responsable: {cageLastCleaning.responsible}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Sin registros previos</p>
                )}
              </>
            );
          }}
        />
      )}

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-200">
        <Button 
          type="submit"
          loading={submitting}
          disabled={selectedCageNumbers.length === 0}
        >
          Registrar Limpieza ({selectedCageNumbers.length} jaula{selectedCageNumbers.length !== 1 ? 's' : ''})
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
