'use client';

import { useState, useRef, useEffect } from 'react';

import { Input, LoadingMessage, CageGroupGrid, SelectionActionBar } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useToast } from '@/shared/contexts/ToastContext';
import { useVaccination } from '../hooks/useVaccination';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { formatDateTime } from '@/shared/utils/dateUtils';

import { FilterBar } from '@/shared/ui/FilterBar';

interface VaccinationCatalogProps {
  onSuccess?: () => void;
}

const VACCINES_STORAGE_KEY = 'vaccination_selected_vaccines';

export function VaccinationCatalog({ onSuccess }: Readonly<VaccinationCatalogProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const { assignedRabbits, galponVaccines, loading, createVaccination, vaccinations, isCreating } = useVaccination();
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
    v.name.toLowerCase().includes(vaccineSearch.toLowerCase()) && !selectedVaccines.includes(v.name)
  );

  if (loading) {
    return <LoadingMessage message="Cargando vacunaciones..." />;
  }

  return (
    <div className="flex flex-col gap-4">

      <div className="bg-card border border-default rounded-xl p-4 relative z-30">
        <span className="block text-sm font-semibold text-main mb-2">Vacunas</span>
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
            <div className="absolute z-50 w-full border border-default dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-card dark:bg-slate-900 mt-1.5 shadow-2xl">
              {filteredVaccines.length === 0 ? (
                <p className="text-muted text-sm p-3">No hay vacunas disponibles</p>
              ) : (
                filteredVaccines.map(vaccine => (
                  <button
                    key={vaccine.name}
                    type="button"
                    onClick={() => handleVaccineSelect(vaccine.name)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border-b border-default dark:border-slate-800 last:border-b-0 text-sm font-medium transition-colors flex items-center justify-between"
                  >
                    <span>{vaccine.name} <span className="text-xs text-muted font-normal">(cada {vaccine.period} días)</span></span>
                    <span className="text-xs text-muted font-normal">+ Agregar</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedVaccines.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {selectedVaccines.map(vaccine => (
              <div key={vaccine} className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm">
                <span>{vaccine}</span>
                <button
                  type="button"
                  onClick={() => handleVaccineRemove(vaccine)}
                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 font-bold ml-0.5"
                  title={`Quitar ${vaccine}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full relative z-10">
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
        buttonText="Registrar Vacunación"
        onRegister={handleRegister}
        isSubmitting={isCreating}
      />
    </div>
  );
}
