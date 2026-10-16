'use client';

import { useState, useMemo } from 'react';
import { Button, Alert, CageCatalog, LoadingMessage, SelectionActionBar } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { useCleaning } from '../hooks/useCleaning';
import { useToast } from '@/shared/contexts/ToastContext';
import { formatDateTime } from '@/shared/utils/dateUtils';

import { FilterBar } from '@/shared/ui/FilterBar';

interface CleaningCatalogProps {
  onSuccess?: () => void;
}

const ecuadorDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Guayaquil',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const getEcuadorDateString = (date: Date) => {
  const parts = ecuadorDateFormatter.formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
};

export function CleaningCatalog({ onSuccess }: Readonly<CleaningCatalogProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const { assignedRabbits, cleanings, loading, createCleaning, error } = useCleaning();

  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    selectedCageNumbers,
    toggleCage,
    selectAllCages,
    allCageGroups,
    cageGroups,
    paginatedGroups,
    currentPage,
    totalPages,
    setCurrentPage,
    clearSelection,
  } = useCageSelection(assignedRabbits, searchTerm);

  const currentEcuadorDateStr = useMemo(() => getEcuadorDateString(new Date()), []);

  const getCageLastCleaning = (cageId: number) => {
    const cageCleanings = cleanings.filter(c => c.cageId === cageId);
    if (cageCleanings.length === 0) return null;
    return cageCleanings.sort((a, b) => new Date(b.cleaningDate).getTime() - new Date(a.cleaningDate).getTime())[0];
  };

  const getCageDaysWithoutCleaning = (cageId: number) => {
    const last = getCageLastCleaning(cageId);
    if (!last) return null; // Sin registros previos
    const lastDate = new Date(new Date(last.cleaningDate).toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    lastDate.setHours(0, 0, 0, 0);
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.max(0, Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
    return diffDays;
  };

  // Jaulas limpiadas hoy en Ecuador
  const cleanedCageIdsToday = useMemo(() => {
    return new Set(
      cleanings
        .filter(c => getEcuadorDateString(new Date(c.cleaningDate)) === currentEcuadorDateStr)
        .map(c => c.cageId)
    );
  }, [cleanings, currentEcuadorDateStr]);

  const totalCages = allCageGroups.length;
  const cleanedCountToday = useMemo(() => {
    return allCageGroups.filter(g => cleanedCageIdsToday.has(g.cageId)).length;
  }, [allCageGroups, cleanedCageIdsToday]);

  const cleaningPercentage = totalCages > 0 ? (cleanedCountToday / totalCages) * 100 : 0;

  // Jaulas pendientes: únicamente las que acumulan 3 o más días sin limpieza (o sin registro previo) y que no se hayan limpiado hoy
  const pendingOverdueCages = useMemo(() => {
    return allCageGroups.filter(g => {
      if (cleanedCageIdsToday.has(g.cageId)) return false;
      const days = getCageDaysWithoutCleaning(g.cageId);
      return days === null || days >= 3;
    });
  }, [allCageGroups, cleanedCageIdsToday, cleanings]);

  const handleRegister = async () => {
    if (selectedCageNumbers.length === 0) {
      showToast('Selecciona al menos una jaula.', 'error');
      return;
    }

    setSubmitting(true);

    const cageIds: number[] = [];
    for (const cageNumber of selectedCageNumbers) {
      const cage = allCageGroups.find(g => g.cageNumber === cageNumber);
      if (cage) {
        cageIds.push(cage.cageId);
      }
    }

    try {
      await createCleaning({
        cageIds
      });
      showToast('Limpieza registrada exitosamente.', 'success');
      clearSelection();
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {error && <Alert variant="error" message={error} />}

      {/* Sección de Estadísticas y Jaulas Pendientes */}
      {totalCages > 0 && (
        <div className="bg-card border border-strong rounded-lg p-5">
          <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
            <span>🧹 Progreso de Limpieza Hoy</span>
          </h3>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted font-medium">Jaulas limpiadas hoy en el galpón</span>
              <span className="text-emerald-600 font-semibold">{cleanedCountToday} / {totalCages} Jaulas</span>
            </div>
            <div className="w-full bg-theme-surface border border-default rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(cleaningPercentage, 100)}%` }} 
              />
            </div>
          </div>

          {pendingOverdueCages.length > 0 && (
            <div className="mt-5 pt-4 border-t border-default flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-main flex items-center gap-2">
                  <span>Jaulas pendientes de limpieza (3 o más días):</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60">
                    {pendingOverdueCages.length} pendiente{pendingOverdueCages.length > 1 ? 's' : ''}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                {pendingOverdueCages.map(cage => {
                  const isSelected = selectedCageNumbers.includes(cage.cageNumber);
                  const days = getCageDaysWithoutCleaning(cage.cageId);
                  return (
                    <button
                      key={cage.cageId}
                      type="button"
                      onClick={() => toggleCage(cage.cageNumber)}
                      className={`min-w-[2.25rem] h-8 px-2.5 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary-600 text-white border-primary-700 ring-2 ring-primary-500/25'
                          : 'bg-theme-surface dark:bg-card text-main border-default hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400'
                      }`}
                      title={`Jaula ${cage.cageNumber} (${cage.rabbits.length} ${cage.rabbits.length === 1 ? 'conejo' : 'conejos'})${days !== null ? ` - Acumula ${days} días sin limpieza` : ' - Sin registros previos'} - Clic para ${isSelected ? 'deseleccionar' : 'seleccionar'}`}
                    >
                      <span>{cage.cageNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full relative z-20">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, código o jaula..."
        />
      </div>

      <div className="flex justify-end">
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
              const days = getCageDaysWithoutCleaning(cage.cageId);
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
                      {days !== null && (
                        <p className={`text-[11px] font-medium mt-1 ${days === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-theme-faint'}`}>
                          {days === 0 ? 'Limpiada hoy' : `Hace ${days} día${days > 1 ? 's' : ''}`}
                        </p>
                      )}
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
