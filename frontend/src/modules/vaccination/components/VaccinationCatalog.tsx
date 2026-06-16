'use client';

import { useState, useRef, useEffect } from 'react';
import { Input, Button, Alert } from '@/shared/ui';
import { useVaccination } from '../hooks/useVaccination';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface VaccinationCatalogProps {
  onSuccess?: () => void;
}

const VACCINES_STORAGE_KEY = 'vaccination_selected_vaccines';

export function VaccinationCatalog({ onSuccess }: VaccinationCatalogProps) {
  const { assignedRabbits, galponVaccines, loading, createVaccination, vaccinations } = useVaccination();
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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
      setServerError('Selecciona al menos un conejo.');
      return;
    }
    if (selectedVaccines.length === 0) {
      setServerError('Selecciona al menos una vacuna.');
      return;
    }

    submitVaccination();
  };

  const submitVaccination = async () => {
    setServerError('');
    setSuccessMsg('');

    try {
      await createVaccination({
        rabbitIds: selectedRabbitIds,
        vaccines: selectedVaccines,
      });
      setSuccessMsg('Vacunación registrada exitosamente.');
      setSelectedRabbitIds([]);
      setTimeout(() => onSuccess?.(), 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado.';
      // Contar cuántos conejos tienen problemas (líneas que empiezan con "El conejo")
      const errorLines = errorMessage.split('\n').filter(line => line.trim().startsWith('El conejo'));
      const hasValidRabbits = errorLines.length < selectedRabbitIds.length;
      
      if (hasValidRabbits) {
        setServerError(`${errorMessage}\n\nPor favor, deselecciona los conejos con problemas mencionados arriba para registrar los demás.`);
      } else {
        setServerError(errorMessage);
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
    return <p className="text-center text-slate-500 py-8">Cargando datos de vacunación...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {serverError && (
        <Alert variant="error" message={serverError} onClose={() => setServerError('')} />
      )}
      {successMsg && <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

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

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Conejos con jaula asignada</h3>
        <Button type="button" variant="outline" size="sm" onClick={selectAllRabbits}>
          Seleccionar todos
        </Button>
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-slate-500">No hay conejos con jaula asignada en el galpón activo.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cageGroups.map(group => (
            <div
              key={group.cageNumber}
              className="border rounded-lg overflow-hidden bg-white"
            >
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800">
                  Jaula #{group.cageNumber} — {group.cageType.charAt(0).toUpperCase() + group.cageType.slice(1)}
                </h4>
              </div>
              <div className="p-3 space-y-2">
                {group.rabbits.map(rabbit => {
                  const isSelected = selectedRabbitIds.includes(rabbit.id);
                  const lastVaccination = getRabbitLastVaccination(rabbit.id);
                  return (
                    <div
                      key={rabbit.id}
                      onClick={() => toggleRabbit(rabbit.id)}
                      className={`p-2 rounded border transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {rabbit.code}{rabbit.name ? ` — ${rabbit.name}` : ''}
                      </p>
                      {isSelected && (
                        <>
                          <p className="text-xs text-slate-500 mt-1">
                            {rabbit.age} meses • {rabbit.weight}kg
                          </p>
                          {lastVaccination && (
                            <div className="pt-2 border-t border-slate-100 mt-2">
                              <p className="text-xs font-semibold text-slate-600">
                                Última vacunación:
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                {lastVaccination.vaccines.join(', ')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDateTime(lastVaccination.vaccinationDate)}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-200">
        <Button 
          onClick={handleRegister}
          disabled={selectedRabbitIds.length === 0 || selectedVaccines.length === 0}
        >
          Registrar Vacunación ({selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  );
}
