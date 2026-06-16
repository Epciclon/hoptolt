'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert, Input } from '@/shared/ui';
import { assignmentService } from '../services/assignment.service';
import { useAssignments } from '../hooks/useAssignments';
import type { Cage } from '@/modules/cages/types/cage.types';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

const schema = z.object({
  cageId: z.coerce.number().int().min(1, 'Selecciona una jaula.').optional(),
  rabbitIds: z.array(z.number()).min(1, 'Selecciona al menos un conejo.'),
});

type FormValues = z.infer<typeof schema>;

interface AssignRabbitFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AssignRabbitForm({ onSuccess, onCancel }: AssignRabbitFormProps) {
  const { assignRabbits } = useAssignments();
  const [cages, setCages] = useState<Cage[]>([]);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [apiError, setApiError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedRabbits, setSelectedRabbits] = useState<number[]>([]);
  const [selectedCage, setSelectedCage] = useState<Cage | null>(null);
  const [cageSearch, setCageSearch] = useState('');
  const [rabbitSearch, setRabbitSearch] = useState('');
  const [showRabbitDropdown, setShowRabbitDropdown] = useState(false);
  const [showCageDropdown, setShowCageDropdown] = useState(false);
  const [cageCapacities, setCageCapacities] = useState<Map<number, number>>(new Map());
  
  const cageDropdownRef = useRef<HTMLDivElement>(null);
  const rabbitDropdownRef = useRef<HTMLDivElement>(null);
  const hasLoadedData = useRef(false);

  useEffect(() => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;
    
    Promise.all([assignmentService.getOperativeCages(), assignmentService.getAvailableRabbits(), assignmentService.getAll()])
      .then(([c, r, assignments]) => {
        setCages(c);
        setRabbits(r);
        // Calcular capacidad actual de cada jaula
        const capacityMap = new Map<number, number>();
        assignments.forEach(a => {
          if (a.status === 'asignado') {
            const current = capacityMap.get(a.cageId) || 0;
            capacityMap.set(a.cageId, current + 1);
          }
        });
        setCageCapacities(capacityMap);
      })
      .catch(() => {});
  }, []);

  const { handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rabbitIds: [] },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError('');
    setWarnings([]);
    if (!values.cageId) {
      setApiError('Debes seleccionar una jaula.');
      return;
    }
    if (!values.rabbitIds || values.rabbitIds.length === 0) {
      setApiError('Debes seleccionar al menos un conejo.');
      return;
    }
    try {
      const result = await assignRabbits({ cageId: values.cageId!, rabbitIds: values.rabbitIds });
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      onSuccess?.();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al asignar los conejos.');
    }
  };

  const handleRabbitToggle = (id: number) => {
    if (!selectedCage) return;
    
    const isAdding = !selectedRabbits.includes(id);
    
    if (isAdding) {
      if (selectedRabbits.length >= selectedCage.capacity) {
        // Reemplazar el último seleccionado con el nuevo (capacidad llena)
        const updated = [...selectedRabbits.slice(0, -1), id];
        setSelectedRabbits(updated);
        setValue('rabbitIds', updated);
      } else {
        // Agregar nuevo si hay espacio disponible
        const updated = [...selectedRabbits, id];
        setSelectedRabbits(updated);
        setValue('rabbitIds', updated);
      }
    } else {
      // Remover si ya está seleccionado
      const updated = selectedRabbits.filter(r => r !== id);
      setSelectedRabbits(updated);
      setValue('rabbitIds', updated);
    }
  };

  const handleRabbitSelect = (rabbit: Rabbit) => {
    handleRabbitToggle(rabbit.id);
    setRabbitSearch('');
    setShowRabbitDropdown(false);
  };

  const handleCageSelect = (cage: Cage) => {
    setSelectedCage(cage);
    setValue('cageId', cage.id);
    setCageSearch('');
    setShowCageDropdown(false);
  };

  const handleCageDeselect = () => {
    setSelectedCage(null);
    setValue('cageId', undefined);
    setSelectedRabbits([]);
    setValue('rabbitIds', []);
  };

  const handleCageInputFocus = () => {
    setShowCageDropdown(true);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (cageDropdownRef.current && !cageDropdownRef.current.contains(target)) {
        setShowCageDropdown(false);
      }
      if (rabbitDropdownRef.current && !rabbitDropdownRef.current.contains(target)) {
        setShowRabbitDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCages = cages.filter(c => {
    const currentCapacity = cageCapacities.get(c.id) || 0;
    const hasSpace = currentCapacity < c.capacity;
    const matchesSearch = c.number.toString().includes(cageSearch) ||
                         c.type.toLowerCase().includes(cageSearch.toLowerCase());
    const notSelected = !selectedCage || c.id !== selectedCage.id;
    return hasSpace && matchesSearch && notSelected;
  });

  const filteredRabbits = rabbits.filter(r => {
    const matchesSearch = r.code.toLowerCase().includes(rabbitSearch.toLowerCase()) ||
                         r.name?.toLowerCase().includes(rabbitSearch.toLowerCase());
    const notSelected = !selectedRabbits.includes(r.id);
    return matchesSearch && notSelected;
  });

  const remainingCapacity = selectedCage ? Math.max(0, selectedCage.capacity - selectedRabbits.length) : 0;
  const canAddMore = remainingCapacity > 0 && selectedCage !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {apiError && <Alert variant="error" message={apiError} onClose={() => setApiError('')} />}
      {warnings.length > 0 && (
        <Alert 
          variant="warning" 
          message={warnings.join(' ')} 
          onClose={() => setWarnings([])} 
        />
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Jaula de destino *</label>
          <div className="relative" ref={cageDropdownRef}>
            <Input
              placeholder="Busca por número o tipo de jaula"
              value={cageSearch}
              onChange={(e) => {
                setCageSearch(e.target.value);
                setShowCageDropdown(true);
              }}
              onFocus={handleCageInputFocus}
            />
            {showCageDropdown && (
              <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-white mt-1">
                {filteredCages.length === 0 ? (
                  <p className="text-gray-500 text-sm p-3">No hay jaulas disponibles</p>
                ) : (
                  filteredCages.map(cage => {
                    const currentCapacity = cageCapacities.get(cage.id) || 0;
                    const available = cage.capacity - currentCapacity;
                    return (
                      <button
                        key={cage.id}
                        type="button"
                        onClick={() => handleCageSelect(cage)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                      >
                        Jaula #{cage.number} — {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)} (cap. {available})
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          {selectedCage && (
            <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mt-2 w-fit">
              <span>Jaula #{selectedCage.number} — {selectedCage.type.charAt(0).toUpperCase() + selectedCage.type.slice(1)}</span>
              <button
                type="button"
                onClick={handleCageDeselect}
                className="text-blue-600 hover:text-blue-800 font-bold"
              >
                ×
              </button>
            </div>
          )}
          {errors.cageId && <p className="text-red-500 text-sm mt-1">{errors.cageId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Conejos a asignar *</label>
          <div className="relative" ref={rabbitDropdownRef}>
            <Input
              placeholder="Busca por código o nombre"
              value={rabbitSearch}
              onChange={(e) => {
                setRabbitSearch(e.target.value);
                setShowRabbitDropdown(true);
              }}
              onFocus={() => setShowRabbitDropdown(true)}
              disabled={!selectedCage}
            />
            {showRabbitDropdown && (
              <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-white mt-1">
                {filteredRabbits.length === 0 ? (
                  <p className="text-gray-500 text-sm p-3">No hay conejos disponibles</p>
                ) : (
                  filteredRabbits.map(rabbit => (
                    <button
                      key={rabbit.id}
                      type="button"
                      onClick={() => handleRabbitSelect(rabbit)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                    >
                      {rabbit.code} — {rabbit.name} ({rabbit.age !== null && rabbit.age !== undefined ? `${rabbit.age} meses` : 'sin edad'}, {rabbit.sex}, {rabbit.purpose})
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {selectedRabbits.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedRabbits.map(id => {
                const rabbit = rabbits.find(r => r.id === id);
                if (!rabbit) return null;
                return (
                  <div key={`rabbit-${id}`} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    <span>{rabbit.name || rabbit.code}</span>
                    <button
                      type="button"
                      onClick={() => handleRabbitToggle(id)}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {errors.rabbitIds && <p className="text-red-500 text-sm mt-1">{errors.rabbitIds.message}</p>}
        </div>
      </div>

      {selectedCage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Capacidad: {selectedCage.capacity} | Seleccionados: {selectedRabbits.length} | Disponible: {remainingCapacity}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" loading={isSubmitting} disabled={selectedRabbits.length === 0 || !selectedCage}>
          Asignar {selectedRabbits.length > 0 ? `${selectedRabbits.length} conejo${selectedRabbits.length > 1 ? 's' : ''}` : 'Conejos'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
