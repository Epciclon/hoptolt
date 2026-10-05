'use client';

import { useState, useMemo } from 'react';
import { Button, Alert, CageCatalog, LoadingMessage, SelectionActionBar } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import type { CageItem } from '@/shared/ui';
import { groupRabbitsByCage } from '@/shared/utils/rabbitUtils';
import { useCleaning } from '../hooks/useCleaning';
import { useToast } from '@/shared/contexts/ToastContext';
import { formatDateTime } from '@/shared/utils/dateUtils';

import { FilterBar } from '@/shared/ui/FilterBar';

interface CleaningCatalogProps {
  onSuccess?: () => void;
}

export function CleaningCatalog({ onSuccess }: Readonly<CleaningCatalogProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const { assignedRabbits, cleanings, loading, createCleaning, error } = useCleaning();

  const { showToast } = useToast();
  const [selectedCageNumbers, setSelectedCageNumbers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const getCageLastCleaning = (cageId: number) => {
    const cageCleanings = cleanings.filter(c => c.cageId === cageId);
    if (cageCleanings.length === 0) return null;
    return cageCleanings.sort((a, b) => new Date(b.cleaningDate).getTime() - new Date(a.cleaningDate).getTime())[0];
  };

  const cageGroups = useMemo<CageItem[]>(() => {
    const groupedByCage = groupRabbitsByCage(assignedRabbits);
    const allGroups = Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);
    if (!searchTerm) return allGroups;
    const q = searchTerm.toLowerCase();
    return allGroups.filter(g =>
      g.cageNumber.toString().includes(q) ||
      g.rabbits.some(r =>
        Boolean(r.name?.toLowerCase().includes(q)) ||
        Boolean(r.code?.toLowerCase().includes(q))
      )
    );
  }, [assignedRabbits, searchTerm]);

  // Regresar a página 1 cuando cambie la búsqueda
  useMemo(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(cageGroups.length / itemsPerPage) || 1;
  const paginatedGroups = cageGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    return <LoadingMessage message="Cargando limpiezas..." />;
  }



  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="error" message={error} />}

      <div className="w-full relative z-20 mb-2">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, código o jaula..."
        />
      </div>

      <div className="flex justify-end mb-2">
        <Button 
          type="button" 
          variant={selectedCageNumbers.length === cageGroups.length && cageGroups.length > 0 ? 'success' : 'secondary'}
          size="sm" 
          onClick={selectAllCages}
        >
          {selectedCageNumbers.length === cageGroups.length && cageGroups.length > 0 ? 'Deseleccionar todas' : 'Seleccionar todas'}
        </Button>
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-muted">No hay conejos con jaula asignada en el galpón activo.</p>
      ) : (
        <>
          <CageCatalog
            cageGroups={paginatedGroups}
            selectedCageNumbers={selectedCageNumbers}
            onToggleCage={toggleCage}
            renderCageContent={(cage) => {
              const cageLastCleaning = getCageLastCleaning(cage.cageId);
              return (
                <>
                  {cageLastCleaning ? (
                    <>
                      <p className="text-xs font-semibold text-muted">
                        Última limpieza:
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {formatDateTime(cageLastCleaning.cleaningDate)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-theme-faint">Sin registros previos</p>
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
      )}

      <SelectionActionBar
        count={selectedCageNumbers.length}
        itemName="jaula"
        buttonText="Registrar Limpieza"
        onRegister={handleRegister}
        isSubmitting={submitting}
      />
    </div>
  );
}
