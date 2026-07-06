'use client';

import { useState, useRef, useEffect } from 'react';
import { Input, Button, CageGroupCard, RabbitSelectableCard, LoadingMessage } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useVaccination } from '../hooks/useVaccination';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface VaccinationCatalogProps {
  onSuccess?: () => void;
}

const VACCINES_STORAGE_KEY = 'vaccination_selected_vaccines';

export function VaccinationCatalog({ onSuccess }: VaccinationCatalogProps) {
  const { assignedRabbits, galponVaccines, loading, createVaccination, vaccinations, isCreating } = useVaccination();
  const { showToast } = useToast();
  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);
  const [selectedVaccines, setSelectedVaccines] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VACCINES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [vaccineSearch, setVaccineSearch] = useState('');
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);

  const vaccineDropdownRef = useRef<HTMLDivElement>(null);

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

  const getRabbitLastVaccination = (rabbitId: number) => {
    const rabbitVaccinations = vaccinations.filter(v => v.rabbitId === rabbitId);
    if (rabbitVaccinations.length === 0) return null;
    return rabbitVaccinations.sort((a, b) => new Date(b.vaccinationDate).getTime() - new Date(a.vaccinationDate).getTime())[0];
  };

  const toggleRabbit = (rabbitId: number) => {
    setSelectedRabbitIds(prev =>
      prev.includes(rabbitId)
        ? prev.filter(id => id !== rabbitId)
        : [...prev, rabbitId]
    );
  };

  const selectAllRabbits = () => {
    if (selectedRabbitIds.length === assignedRabbits.length) {
      setSelectedRabbitIds([]);
    } else {
      setSelectedRabbitIds(assignedRabbits.map(r => r.id));
    }
  };

  const handleVaccineSelect = (vaccine: string) => {
    if (!selectedVaccines.includes(vaccine)) {
      const newSelection = [...selectedVaccines, vaccine];
      setSelectedVaccines(newSelection);
      localStorage.setItem(VACCINES_STORAGE_KEY, JSON.stringify(newSelection));
    }
    setVaccineSearch('');
    setShowVaccineDropdown(false);
  };

  const handleVaccineRemove = (vaccine: string) => {
    const newSelection = selectedVaccines.filter(v => v !== vaccine);
    setSelectedVaccines(newSelection);
    localStorage.setItem(VACCINES_STORAGE_KEY, JSON.stringify(newSelection));
  };

  const handleRegister = () => {
    if (selectedRabbitIds.length === 0) {
      showToast('Selecciona al menos un conejo.', 'error');
      return;
    }
    if (selectedVaccines.length === 0) {
      showToast('Selecciona al menos una vacuna.', 'error');
      return;
    }

    submitVaccination();
  };

  const submitVaccination = async () => {


    try {
      await createVaccination({
        rabbitIds: selectedRabbitIds,
        vaccines: selectedVaccines,
      });
      showToast('Vacunación registrada exitosamente.', 'success');
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (vaccineDropdownRef.current && !vaccineDropdownRef.current.contains(target)) {
        setShowVaccineDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVaccines = galponVaccines.filter(v =>
    v.name.toLowerCase().includes(vaccineSearch.toLowerCase())
  );

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
    return <LoadingMessage message="Cargando vacunaciones..." />;
  }

  return (
    <div className="flex flex-col gap-4">


      <div>
        <label className="block text-sm font-medium mb-2">Vacunas</label>
        <div className="relative" ref={vaccineDropdownRef}>
          <Input
            placeholder="Busca o selecciona vacunas..."
            value={vaccineSearch}
            onChange={(e) => {
              setVaccineSearch(e.target.value);
              setShowVaccineDropdown(true);
            }}
            onFocus={() => setShowVaccineDropdown(true)}
          />
          {showVaccineDropdown && (
            <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-white mt-1">
              {filteredVaccines.length === 0 ? (
                <p className="text-gray-500 text-sm p-3">No hay vacunas disponibles</p>
              ) : (
                filteredVaccines.map(vaccine => (
                  <button
                    key={vaccine.name}
                    type="button"
                    onClick={() => handleVaccineSelect(vaccine.name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                  >
                    {vaccine.name} (cada {vaccine.period} días)
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedVaccines.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedVaccines.map(vaccine => (
              <div key={vaccine} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                <span>{vaccine}</span>
                <button
                  type="button"
                  onClick={() => handleVaccineRemove(vaccine)}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
                const lastVaccination = getRabbitLastVaccination(rabbit.id);

                return (
                  <RabbitSelectableCard
                    key={rabbit.id}
                    rabbit={rabbit}
                    isSelected={isSelected}
                    onClick={() => toggleRabbit(rabbit.id)}
                    extras={
                      <>
                        <p className="text-[10px] text-slate-500 mb-0.5">Última vacunación:</p>
                        <p className="text-xs font-medium text-slate-700 truncate" title={lastVaccination ? lastVaccination.vaccines.join(', ') : 'Nunca'}>
                          {lastVaccination ? lastVaccination.vaccines.join(', ') : 'Nunca'}
                        </p>
                        {lastVaccination && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {formatDateTime(lastVaccination.vaccinationDate)}
                          </p>
                        )}
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
            disabled={selectedVaccines.length === 0}
            loading={isCreating}
          >
            Registrar Vacunación ({selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''})
          </Button>
        </div>
      )}
    </div>
  );
}
