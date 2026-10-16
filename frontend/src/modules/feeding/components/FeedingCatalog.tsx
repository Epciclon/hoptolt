'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input, Button, CageCatalog, LoadingMessage, Dialog, SelectionActionBar } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { useFeeding } from '../hooks/useFeeding';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/shared/contexts/ToastContext';

import { FilterBar } from '@/shared/ui/FilterBar';

interface FeedingCatalogProps {
  onSuccess?: () => void;
}

const FOOD_TYPES_STORAGE_KEY = 'feeding_selected_food_types';

// Formatters para Ecuador
const ecuadorDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Guayaquil',
  year: 'numeric', month: '2-digit', day: '2-digit'
});

const ecuadorHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Guayaquil',
  hour: 'numeric',
  hour12: false
});

const getEcuadorDateString = (date: Date) => {
  const parts = ecuadorDateFormatter.formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
};

export function FeedingCatalog({ onSuccess }: Readonly<FeedingCatalogProps>) {
  const { assignedRabbits, foodTypes, loading, createFeeding, feedings } = useFeeding();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const {
    selectedCageNumbers,
    setSelectedCageNumbers,
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

  const { showToast } = useToast();
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FOOD_TYPES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [foodSearch, setFoodSearch] = useState('');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cagesWithIssue, setCagesWithIssue] = useState<Array<{ cageNumber: number; cageType: string; feedingsToday: number }>>([]);
  
  const foodDropdownRef = useRef<HTMLDivElement>(null);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    // Formatear en zona horaria de Ecuador (GMT-5)
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

  const currentEcuadorShift = (() => {
    const hour = Number.parseInt(ecuadorHourFormatter.format(new Date()), 10);
    return hour < 12 ? 'mañana' : 'tarde';
  })();
  const currentEcuadorDateStr = getEcuadorDateString(new Date());

  const getCageFeedingsThisShift = (cageId: number) => {
    return feedings.filter(f => {
      const feedingDate = new Date(f.feedingDate);
      const ecuadorFeedingDate = getEcuadorDateString(feedingDate);
      return f.cageId === cageId && ecuadorFeedingDate === currentEcuadorDateStr && f.shift === currentEcuadorShift;
    }).length;
  };

  const getCageLastFeeding = (cageId: number) => {
    const cageFeedings = feedings.filter(f => f.cageId === cageId);
    if (cageFeedings.length === 0) return null;
    return cageFeedings.sort((a, b) => new Date(b.feedingDate).getTime() - new Date(a.feedingDate).getTime())[0];
  };

  const handleFoodSelect = (food: string) => {
    if (!selectedFoodTypes.includes(food)) {
      const newSelection = [...selectedFoodTypes, food];
      setSelectedFoodTypes(newSelection);
      localStorage.setItem(FOOD_TYPES_STORAGE_KEY, JSON.stringify(newSelection));
    }
    setFoodSearch('');
    setShowFoodDropdown(false);
  };

  const handleFoodRemove = (food: string) => {
    const newSelection = selectedFoodTypes.filter(f => f !== food);
    setSelectedFoodTypes(newSelection);
    localStorage.setItem(FOOD_TYPES_STORAGE_KEY, JSON.stringify(newSelection));
  };

  const checkJustificationRequired = () => {
    const cagesWithIssue: Array<{ cageNumber: number; cageType: string; feedingsToday: number }> = [];
    for (const cageNumber of selectedCageNumbers) {
      const cage = allCageGroups.find(g => g.cageNumber === cageNumber);
      if (cage) {
        const feedingsToday = getCageFeedingsThisShift(cage.cageId);
        if (feedingsToday >= 1) {
          cagesWithIssue.push({
            cageNumber: cage.cageNumber,
            cageType: cage.cageType,
            feedingsToday
          });
        }
      }
    }
    return cagesWithIssue;
  };

  const handleRegister = () => {
    if (selectedCageNumbers.length === 0) {
      showToast('Selecciona al menos una jaula.', 'error');
      return;
    }
    if (selectedFoodTypes.length === 0) {
      showToast('Selecciona al menos un tipo de alimento.', 'error');
      return;
    }

    const cagesWithIssueList = checkJustificationRequired();
    
    if (cagesWithIssueList.length > 0) {
      setCagesWithIssue(cagesWithIssueList);
      setShowJustificationModal(true);
    } else {
      submitFeeding('Alimentación normal');
    }
  };

  const submitFeeding = async (justificationText?: string) => {

    
    const cageIds: number[] = [];
    for (const cageNumber of selectedCageNumbers) {
      const cage = allCageGroups.find(g => g.cageNumber === cageNumber);
      if (cage) {
        cageIds.push(cage.cageId);
      }
    }

    setIsSubmitting(true);
    try {
      await createFeeding({
        cageIds,
        foodTypes: selectedFoodTypes,
        justification: justificationText,
        shift: currentEcuadorShift
      });
      showToast('Alimentación registrada exitosamente.', 'success');
      setSelectedCageNumbers([]);
      setShowJustificationModal(false);
      setJustification('');
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelJustification = () => {
    setShowJustificationModal(false);
    setJustification('');
    setCagesWithIssue([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (foodDropdownRef.current && !foodDropdownRef.current.contains(target)) {
        setShowFoodDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFoodTypes = foodTypes.filter(f => 
    f.toLowerCase().includes(foodSearch.toLowerCase()) && !selectedFoodTypes.includes(f)
  );

  // Estadísticas del día
  const feedingsToday = useMemo(() => {
    return feedings.filter(f => {
      const fd = new Date(f.feedingDate);
      return getEcuadorDateString(fd) === currentEcuadorDateStr;
    });
  }, [feedings, currentEcuadorDateStr]);

  const uniqueCagesMorning = useMemo(() => {
    return new Set(feedingsToday.filter(f => f.shift?.toLowerCase() === 'mañana').map(f => f.cageId)).size;
  }, [feedingsToday]);

  const uniqueCagesAfternoon = useMemo(() => {
    return new Set(feedingsToday.filter(f => f.shift?.toLowerCase() === 'tarde').map(f => f.cageId)).size;
  }, [feedingsToday]);

  const totalCages = allCageGroups.length;

  const morningPercentage = totalCages > 0 ? (uniqueCagesMorning / totalCages) * 100 : 0;
  const afternoonPercentage = totalCages > 0 ? (uniqueCagesAfternoon / totalCages) * 100 : 0;

  // Jaulas pendientes en el turno actual
  const fedCageIdsThisShift = useMemo(() => {
    return new Set(
      feedingsToday
        .filter(f => f.shift?.toLowerCase() === currentEcuadorShift)
        .map(f => f.cageId)
    );
  }, [feedingsToday, currentEcuadorShift]);

  const pendingCagesThisShift = useMemo(() => {
    return allCageGroups.filter(g => !fedCageIdsThisShift.has(g.cageId));
  }, [allCageGroups, fedCageIdsThisShift]);

  if (loading) {
    return <LoadingMessage message="Cargando alimentación..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Sección de Estadísticas (Barra de progreso y jaulas pendientes) */}
      <div className="bg-card border border-strong rounded-lg p-5">
        <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <span>📊 Progreso de Alimentación Hoy</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted font-medium">Turno Mañana</span>
              <span className="text-emerald-600 font-semibold">{uniqueCagesMorning} / {totalCages} Jaulas</span>
            </div>
            <div className="w-full bg-theme-surface border border-default rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(morningPercentage, 100)}%` }} 
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted font-medium">Turno Tarde</span>
              <span className="text-orange-600 font-semibold">{uniqueCagesAfternoon} / {totalCages} Jaulas</span>
            </div>
            <div className="w-full bg-theme-surface border border-default rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(afternoonPercentage, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Jaulas pendientes de alimentar en el turno actual con cuadros como los tipos de alimento */}
        {pendingCagesThisShift.length > 0 && (
          <div className="mt-5 pt-4 border-t border-default flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-main flex items-center gap-2">
              <span>Jaulas sin alimentar:</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                pendingCagesThisShift.length === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : currentEcuadorShift === 'mañana'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60'
              }`}>
                {pendingCagesThisShift.length === 0 ? '0 pendientes (Completo)' : `${pendingCagesThisShift.length} pendiente${pendingCagesThisShift.length > 1 ? 's' : ''}`}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
              {pendingCagesThisShift.map(cage => {
                const isSelected = selectedCageNumbers.includes(cage.cageNumber);
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
                    title={`Jaula ${cage.cageNumber} (${cage.rabbits.length} ${cage.rabbits.length === 1 ? 'conejo' : 'conejos'}) - Clic para ${isSelected ? 'deseleccionar' : 'seleccionar'}`}
                  >
                    <span>{cage.cageNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-strong rounded-lg p-4 shadow-sm flex flex-col gap-4 relative z-20">
        <div className="flex items-center justify-between border-b border-default pb-3">
          <span className="text-sm font-medium text-main">Turno Actual:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentEcuadorShift === 'mañana' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400'}`}>
            {currentEcuadorShift === 'mañana' ? 'Mañana' : 'Tarde'}
          </span>
        </div>


        <div className="w-full relative z-30" ref={foodDropdownRef}>
          <span className="block text-sm font-medium text-main mb-2">Tipos de Alimento</span>
          <Input
            placeholder="Busca y selecciona tipos de alimento"
            value={foodSearch}
            onChange={(e) => {
              setFoodSearch(e.target.value);
              setShowFoodDropdown(true);
            }}
            onFocus={() => setShowFoodDropdown(true)}
          />
          {showFoodDropdown && (
            <div className="absolute z-50 w-full border border-default dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-card dark:bg-slate-900 mt-1.5 shadow-2xl">
              {filteredFoodTypes.length === 0 ? (
                <p className="text-muted text-sm p-3">No hay tipos de alimento disponibles</p>
              ) : (
                filteredFoodTypes.map(food => (
                  <button
                    key={food}
                    type="button"
                    onClick={() => handleFoodSelect(food)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border-b border-default dark:border-slate-800 last:border-b-0 text-sm font-medium transition-colors flex items-center justify-between"
                  >
                    <span>{food}</span>
                    <span className="text-xs text-muted font-normal">+ Agregar</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedFoodTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedFoodTypes.map(food => (
              <div key={food} className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm">
                <span>{food}</span>
                <button
                  type="button"
                  onClick={() => handleFoodRemove(food)}
                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 font-bold ml-0.5"
                  title={`Quitar ${food}`}
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

      <div className="flex justify-end mb-2">
        <Button 
          type="button" 
          variant={selectedCageNumbers.length === cageGroups.length && cageGroups.length > 0 ? 'success' : 'secondary'}
          size="sm" 
          onClick={selectAllCages}
        >
          {selectedCageNumbers.length === cageGroups.length && cageGroups.length > 0
            ? 'Deseleccionar todos'
            : 'Seleccionar todos'}
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
              const cageLastFeeding = getCageLastFeeding(cage.cageId);
              const cageFeedingsThisShift = getCageFeedingsThisShift(cage.cageId);
              return (
                <>
                  {cageLastFeeding ? (
                    <>
                      <p className="text-xs font-semibold text-muted">
                        Último alimento suministrado:
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {cageLastFeeding.foodTypes.join(', ')}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {formatDateTime(cageLastFeeding.feedingDate)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-theme-faint">Sin registros previos</p>
                  )}
                  <p className="text-xs text-muted mt-1 font-medium text-emerald-600">
                    {cageFeedingsThisShift} registro{cageFeedingsThisShift !== 1 ? 's' : ''} tuyos en este turno
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
      )}

      <SelectionActionBar
        count={selectedCageNumbers.length}
        itemName="jaula"
        buttonText="Registrar Alimentación"
        onRegister={handleRegister}
        isSubmitting={isSubmitting}
        isDisabled={selectedFoodTypes.length === 0}
      />

      <Dialog
        open={showJustificationModal}
        onClose={handleCancelJustification}
        title="Justificación Requerida"
        description=""
        size="sm"
      >
        <div className="p-3 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-md mb-3 mt-1">
          <h4 className="text-sm font-semibold text-main mb-1">⚠️ Política de Alimentación</h4>
          <p className="text-sm text-muted">
            El sistema permite un registro de alimentación sin justificación por turno en cada jaula. Al registrar un alimento adicional en el turno de la <strong>{currentEcuadorShift}</strong>, se requiere ingresar una justificación.
          </p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm font-medium text-main mb-1.5">Jaulas con observaciones en este turno:</p>
          <ul className="text-sm text-main max-h-36 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2 divide-y divide-slate-100 dark:divide-slate-800">
            {cagesWithIssue.map(cage => (
              <li key={cage.cageNumber} className="flex items-center justify-between py-1 px-1">
                <span className="font-medium">Jaula {cage.cageNumber}</span>
                <span className="text-red-500 dark:text-red-400 font-medium text-xs">
                  ({cage.feedingsToday} {cage.feedingsToday === 1 ? 'registro' : 'registros'})
                </span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-4">
          <label htmlFor="justificationInput" className="block text-sm font-medium text-main mb-1.5">Justificación</label>
          <textarea
            id="justificationInput"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Describe el motivo de la alimentación adicional..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-main rounded-md p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button 
            variant="secondary" 
            onClick={handleCancelJustification}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => submitFeeding(justification || 'Alimentación normal')}
            disabled={!justification.trim()}
          >
            Registrar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
