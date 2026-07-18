'use client';

import { useState, useRef, useEffect } from 'react';

import { Input, Button, LoadingMessage, CageGroupGrid } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useVaccination } from '../hooks/useVaccination';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { formatDateTime } from '@/shared/utils/dateUtils';

interface VaccinationCatalogProps {
  onSuccess?: () => void;
}

const VACCINES_STORAGE_KEY = 'vaccination_selected_vaccines';

export function VaccinationCatalog({ onSuccess }: Readonly<VaccinationCatalogProps>) {
  const { assignedRabbits, galponVaccines, loading, createVaccination, vaccinations, isCreating } = useVaccination();
  const { showToast } = useToast();
  
  const {
    selectedRabbitIds,
    toggleRabbit,
    selectAllRabbits,
    cageGroups,
    isAllSelected,
    clearSelection
  } = useCageSelection(assignedRabbits);

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

  const getRabbitLastVaccination = (rabbitId: number) => {
    const rabbitVaccinations = vaccinations.filter(v => v.rabbitId === rabbitId);
    if (rabbitVaccinations.length === 0) return null;
    return rabbitVaccinations.sort((a, b) => new Date(b.vaccinationDate).getTime() - new Date(a.vaccinationDate).getTime())[0];
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

  if (loading) {
    return <LoadingMessage message="Cargando vacunaciones..." />;
  }

  return (
    <div className="flex flex-col gap-4">


      <div>
        <span className="block text-sm font-medium mb-2">Vacunas</span>
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
            <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-card mt-1">
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
              <div key={vaccine} className="flex items-center gap-1 bg-sky-100 text-sky-800 border border-sky-200 px-2 py-1 rounded text-sm shadow-sm">
                <span>{vaccine}</span>
                <button
                  type="button"
                  onClick={() => handleVaccineRemove(vaccine)}
                  className="text-sky-600 hover:text-sky-800 font-bold ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CageGroupGrid
        cageGroups={cageGroups}
        selectedRabbitIds={selectedRabbitIds}
        onToggleRabbit={toggleRabbit}
        renderExtras={(rabbit) => {
          const lastVaccination = getRabbitLastVaccination(rabbit.id);
          return (
            <>
              <p className="text-[10px] text-muted mb-0.5">Última vacunación:</p>
              <p className="text-xs font-medium text-main truncate" title={lastVaccination ? lastVaccination.vaccines.join(', ') : 'Nunca'}>
                {lastVaccination ? lastVaccination.vaccines.join(', ') : 'Nunca'}
              </p>
              {lastVaccination && (
                <p className="text-[10px] text-muted mt-0.5">
                  {formatDateTime(lastVaccination.vaccinationDate)}
                </p>
              )}
            </>
          );
        }}
      />

      {selectedRabbitIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 shadow-xl border-2 border-primary-500 bg-theme-surface p-3 rounded-2xl flex items-center justify-between gap-6 max-w-[90vw] min-w-[300px]">
          <span className="text-main font-semibold px-2">{selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''} seleccionado{selectedRabbitIds.length !== 1 ? 's' : ''}</span>
          <Button
            onClick={handleRegister}
            disabled={selectedVaccines.length === 0}
            loading={isCreating}
            variant="primary"
          >
            Registrar Vacunación
          </Button>
        </div>
      )}
    </div>
  );
}
