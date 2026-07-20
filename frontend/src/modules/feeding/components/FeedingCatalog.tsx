'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input, Button, CageCatalog, LoadingMessage, Dialog, SelectionActionBar } from '@/shared/ui';
import type { CageItem } from '@/shared/ui';
import { groupRabbitsByCage } from '@/shared/utils/rabbitUtils';
import { useFeeding } from '../hooks/useFeeding';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/shared/contexts/ToastContext';

interface FeedingCatalogProps {
  onSuccess?: () => void;
}

const FOOD_TYPES_STORAGE_KEY = 'feeding_selected_food_types';

export function FeedingCatalog({ onSuccess }: Readonly<FeedingCatalogProps>) {
  const { assignedRabbits, foodTypes, loading, createFeeding, feedings } = useFeeding();
  const { user } = useAuth();

  const { showToast } = useToast();
  const [selectedCageNumbers, setSelectedCageNumbers] = useState<number[]>([]);
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

  const currentEcuadorShift = (() => {
    const hour = Number.parseInt(ecuadorHourFormatter.format(new Date()), 10);
    return hour < 12 ? 'mañana' : 'tarde';
  })();
  const currentEcuadorDateStr = getEcuadorDateString(new Date());

  const getCageFeedingsThisShift = (cageId: number) => {
    return feedings.filter(f => {
      const feedingDate = new Date(f.feedingDate);
      const ecuadorFeedingDate = getEcuadorDateString(feedingDate);
      return f.cageId === cageId && ecuadorFeedingDate === currentEcuadorDateStr && f.shift === currentEcuadorShift && f.profileId === user?.id;
    }).length;
  };

  const getCageLastFeeding = (cageId: number) => {
    const cageFeedings = feedings.filter(f => f.cageId === cageId);
    if (cageFeedings.length === 0) return null;
    return cageFeedings.sort((a, b) => new Date(b.feedingDate).getTime() - new Date(a.feedingDate).getTime())[0];
  };

  const cageGroups = useMemo<CageItem[]>(() => {
    const groupedByCage = groupRabbitsByCage(assignedRabbits);

    return Object.values(groupedByCage)
      .sort((a, b) => a.cageNumber - b.cageNumber);
  }, [assignedRabbits]);

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
      const cage = cageGroups.find(g => g.cageNumber === cageNumber);
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
      const cage = cageGroups.find(g => g.cageNumber === cageNumber);
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

  if (loading) {
    return <LoadingMessage message="Cargando alimentación..." />;
  }

  // Estadísticas del día
  const feedingsToday = feedings.filter(f => {
    const fd = new Date(f.feedingDate);
    return getEcuadorDateString(fd) === currentEcuadorDateStr;
  });

  const uniqueCagesMorning = new Set(feedingsToday.filter(f => f.shift?.toLowerCase() === 'mañana').map(f => f.cageId)).size;
  const uniqueCagesAfternoon = new Set(feedingsToday.filter(f => f.shift?.toLowerCase() === 'tarde').map(f => f.cageId)).size;
  const totalCages = cageGroups.length;

  const morningPercentage = totalCages > 0 ? (uniqueCagesMorning / totalCages) * 100 : 0;
  const afternoonPercentage = totalCages > 0 ? (uniqueCagesAfternoon / totalCages) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Sección de Estadísticas (Barra de progreso) */}
      <div className="bg-card border border-strong rounded-lg p-5">
        <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          📊 Progreso de Alimentación Hoy
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
      </div>

      <div className="bg-card border border-strong rounded-lg p-4 sticky top-0 z-10 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-default pb-3">
          <span className="text-sm font-medium text-main">Turno Actual:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentEcuadorShift === 'mañana' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
            {currentEcuadorShift === 'mañana' ? 'Mañana' : 'Tarde'}
          </span>
        </div>

        <div className="w-full relative z-20" ref={foodDropdownRef}>
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
            <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-card mt-1">
              {filteredFoodTypes.length === 0 ? (
                <p className="text-muted text-sm p-3">No hay tipos de alimento disponibles</p>
              ) : (
                filteredFoodTypes.map(food => (
                  <button
                    key={food}
                    type="button"
                    onClick={() => handleFoodSelect(food)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                  >
                    {food}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedFoodTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedFoodTypes.map(food => (
              <div key={food} className="flex items-center gap-1 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 px-2 py-1 rounded text-sm shadow-sm">
                <span>{food}</span>
                <button
                  type="button"
                  onClick={() => handleFoodRemove(food)}
                  className="text-sky-600 hover:text-sky-800 font-bold ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
        <CageCatalog
          cageGroups={cageGroups}
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
        <div className="p-3 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-md mb-4 mt-2">
          <h4 className="text-sm font-semibold text-main mb-2">⚠️ Política de Alimentación</h4>
          <p className="text-sm text-muted">
            El sistema permite un registro de alimentación sin justificación por turno y por usuario. Estás intentando registrar un segundo alimento en el turno de la <strong>{currentEcuadorShift}</strong>, por lo que es requerido ingresar un motivo.
          </p>
        </div>
        
        <div className="mb-4">
          <p className="text-sm font-medium text-main mb-2">Jaulas con observaciones en este turno:</p>
          <ul className="text-sm text-muted space-y-1">
            {cagesWithIssue.map(cage => (
              <li key={cage.cageNumber} className="flex items-center gap-2">
                <span className="font-medium">Jaula #{cage.cageNumber} - {cage.cageType.charAt(0).toUpperCase() + cage.cageType.slice(1)}</span>
                <span className="text-red-600">({cage.feedingsToday} registros)</span>
              </li>
            ))}
          </ul>
        </div>
        
        <p className="text-sm text-muted mb-4">
          Por favor, explica el motivo de la alimentación adicional.
        </p>
        <div className="mb-4">
          <label htmlFor="justificationInput" className="block text-sm font-medium text-muted mb-2">Justificación</label>
          <textarea
            id="justificationInput"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explica el motivo de la alimentación adicional..."
            className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
