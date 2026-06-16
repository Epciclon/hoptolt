'use client';

import { useState, useRef, useEffect } from 'react';
import { Input, Button, Alert, CageCatalog } from '@/shared/ui';
import type { CageItem } from '@/shared/ui';
import { useFeeding } from '../hooks/useFeeding';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface FeedingCatalogProps {
  onSuccess?: () => void;
}

const FOOD_TYPES_STORAGE_KEY = 'feeding_selected_food_types';

export function FeedingCatalog({ onSuccess }: FeedingCatalogProps) {
  const { assignedRabbits, foodTypes, loading, createFeeding, feedings } = useFeeding();
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const getCageFeedingsToday = (cageId: number) => {
    const now = new Date();
    const ecuadorToday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' })).toDateString();
    return feedings.filter(f => {
      const feedingDate = new Date(f.feedingDate);
      const ecuadorFeedingDate = new Date(feedingDate.toLocaleString('en-US', { timeZone: 'America/Guayaquil' })).toDateString();
      return f.cageId === cageId && ecuadorFeedingDate === ecuadorToday;
    }).length;
  };

  const getCageLastFeeding = (cageId: number) => {
    const cageFeedings = feedings.filter(f => f.cageId === cageId);
    if (cageFeedings.length === 0) return null;
    return cageFeedings.sort((a, b) => new Date(b.feedingDate).getTime() - new Date(a.feedingDate).getTime())[0];
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
        const feedingsToday = getCageFeedingsToday(cage.cageId);
        if (feedingsToday >= 2) {
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
      setServerError('Selecciona al menos una jaula.');
      return;
    }
    if (selectedFoodTypes.length === 0) {
      setServerError('Selecciona al menos un tipo de alimento.');
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
    setServerError('');
    setSuccessMsg('');
    
    const cageIds: number[] = [];
    for (const cageNumber of selectedCageNumbers) {
      const cage = cageGroups.find(g => g.cageNumber === cageNumber);
      if (cage) {
        cageIds.push(cage.cageId);
      }
    }

    try {
      await createFeeding({
        cageIds,
        foodTypes: selectedFoodTypes,
        justification: justificationText,
      });
      setSuccessMsg('Alimentación registrada exitosamente.');
      setSelectedCageNumbers([]);
      setShowJustificationModal(false);
      setJustification('');
      setTimeout(() => onSuccess?.(), 1000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado.');
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
    return <p className="text-center text-slate-500 py-8">Cargando datos...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {serverError && <Alert variant="error" message={serverError} onClose={() => setServerError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} />}

      <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-0 z-10 shadow-sm">
        <label className="block text-sm font-medium text-slate-600 mb-2">Tipos de Alimento</label>
        <div className="relative" ref={foodDropdownRef}>
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
            <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-white mt-1">
              {filteredFoodTypes.length === 0 ? (
                <p className="text-gray-500 text-sm p-3">No hay tipos de alimento disponibles</p>
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
              <div key={food} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                <span>{food}</span>
                <button
                  type="button"
                  onClick={() => handleFoodRemove(food)}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-600">Jaulas con conejos asignados</label>
        <Button type="button" variant="outline" size="sm" onClick={selectAllCages}>
          Seleccionar todos
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
            const cageLastFeeding = getCageLastFeeding(cage.cageId);
            const cageFeedingsToday = getCageFeedingsToday(cage.cageId);
            return (
              <>
                {cageLastFeeding ? (
                  <>
                    <p className="text-xs font-semibold text-slate-600">
                      Último alimento suministrado:
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {cageLastFeeding.foodTypes.join(', ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDateTime(cageLastFeeding.feedingDate)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Sin registros previos</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {cageFeedingsToday} registro{cageFeedingsToday !== 1 ? 's' : ''} hoy
                </p>
              </>
            );
          }}
        />
      )}

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-200">
        <Button 
          onClick={handleRegister}
          disabled={selectedCageNumbers.length === 0 || selectedFoodTypes.length === 0}
        >
          Registrar Alimentación ({selectedCageNumbers.length} jaula{selectedCageNumbers.length !== 1 ? 's' : ''})
        </Button>
      </div>

      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Justificación Requerida</h3>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Política de Alimentación</h4>
              <p className="text-sm text-blue-800">
                Dividir la ración diaria en dos tomas (una por la mañana y otra al atardecer) permite controlar el desperdicio y asegurar que los animales coman fresco. Por esta razón, el sistema permite hasta 2 registros de alimentación por día sin justificación.
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Jaulas con más de 2 registros hoy:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                {cagesWithIssue.map(cage => (
                  <li key={cage.cageNumber} className="flex items-center gap-2">
                    <span className="font-medium">Jaula #{cage.cageNumber} — {cage.cageType.charAt(0).toUpperCase() + cage.cageType.slice(1)}</span>
                    <span className="text-red-600">({cage.feedingsToday} registros)</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Por favor, explica el motivo de la alimentación adicional.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">Justificación</label>
              <textarea
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
          </div>
        </div>
      )}
    </div>
  );
}
