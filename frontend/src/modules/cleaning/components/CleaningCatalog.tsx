'use client';

import { useState } from 'react';
import { Button, Alert, CageCatalog } from '@/shared/ui';
import type { CageItem } from '@/shared/ui';
import { useCleaning } from '../hooks/useCleaning';

interface CleaningCatalogProps {
  onSuccess?: () => void;
}

export function CleaningCatalog({ onSuccess }: CleaningCatalogProps) {
  const { assignedRabbits, cleanings, loading, createCleaning, error } = useCleaning();
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const handleRegister = async () => {
    if (selectedCageNumbers.length === 0) {
      setServerError('Selecciona al menos una jaula.');
      return;
    }

    setServerError('');
    setSuccessMsg('');
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
      setSuccessMsg('Limpieza registrada exitosamente.');
      setSelectedCageNumbers([]);
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-slate-500 py-8">Cargando datos de limpieza...</p>;
  }

  const globalError = error || serverError;

  return (
    <div className="flex flex-col gap-4">
      {globalError && <Alert variant="error" message={globalError} onClose={() => setServerError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} />}

      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-600">Jaulas con conejos asignados</label>
        <Button type="button" variant="outline" size="sm" onClick={selectAllCages}>
          {selectedCageNumbers.length === cageGroups.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
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
          onClick={handleRegister}
          loading={submitting}
          disabled={selectedCageNumbers.length === 0}
        >
          Registrar Limpieza ({selectedCageNumbers.length} jaula{selectedCageNumbers.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  );
}
