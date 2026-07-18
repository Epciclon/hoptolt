'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert, Input, LoadingMessage } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';

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

export function AssignRabbitForm({ onSuccess, onCancel }: Readonly<AssignRabbitFormProps>) {
  const { assignRabbits, operativeCages: cages, availableRabbits: rabbits, loading: loadingData } = useAssignments();
  const { showToast } = useToast();

  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedRabbits, setSelectedRabbits] = useState<number[]>([]);
  const [selectedCage, setSelectedCage] = useState<Cage | null>(null);
  const [cageSearch, setCageSearch] = useState('');
  const [rabbitSearch, setRabbitSearch] = useState('');
  const [showRabbitDropdown, setShowRabbitDropdown] = useState(false);
  const [showCageDropdown, setShowCageDropdown] = useState(false);

  const cageDropdownRef = useRef<HTMLDivElement>(null);
  const rabbitDropdownRef = useRef<HTMLDivElement>(null);

  const { handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rabbitIds: [] },
  });

  const onSubmit = async (values: FormValues) => {

    setWarnings([]);
    if (!values.cageId) {
      showToast('Debes seleccionar una jaula.', 'error');
      return;
    }
    if (!values.rabbitIds || values.rabbitIds.length === 0) {
      showToast('Debes seleccionar al menos un conejo.', 'error');
      return;
    }
    try {
      const result = await assignRabbits({ cageId: values.cageId!, rabbitIds: values.rabbitIds });
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      showToast('Conejos asignados exitosamente.', 'success');
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al asignar los conejos.', 'error');
    }
  };

  const handleRabbitToggle = (id: number) => {
    if (!selectedCage) return;

    const isAdding = !selectedRabbits.includes(id);

    if (isAdding) {
      const currentAssigned = selectedCage.assignedCount || 0;
      const spaceLeft = selectedCage.capacity - currentAssigned;
      
      if (selectedRabbits.length >= spaceLeft) {
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
    const currentCapacity = c.assignedCount || 0;
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

  const currentAssigned = selectedCage ? (selectedCage.assignedCount || 0) : 0;


  if (loadingData) {
    return <LoadingMessage message="Cargando jaulas y conejos disponibles..." />;
  }

  const getSubmitLabel = () => {
    if (selectedRabbits.length === 0) return 'Asignar Conejos';
    const label = selectedRabbits.length > 1 ? 'conejos' : 'conejo';
    return `Asignar ${selectedRabbits.length} ${label}`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 min-h-[320px]">

      {warnings.length > 0 && (
        <Alert
          variant="warning"
          message={warnings.join(' ')}
          onClose={() => setWarnings([])}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="cageSelect" className="block text-sm font-medium mb-2 text-main">Jaula de destino <span className="text-red-500">*</span></label>
          <div className="relative" ref={cageDropdownRef}>
            <Input
              id="cageSelect"
              placeholder="Busca por número o tipo de jaula"
              value={cageSearch}
              onChange={(e) => {
                setCageSearch(e.target.value);
                setShowCageDropdown(true);
              }}
              onFocus={handleCageInputFocus}
            />
            {showCageDropdown && (
              <div className="absolute z-50 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-card mt-1 shadow-xl">
                {filteredCages.length === 0 ? (
                  <p className="text-gray-500 text-sm p-3">No hay jaulas disponibles</p>
                ) : (
                  filteredCages.map(cage => {
                    const currentCapacity = cage.assignedCount || 0;
                    const available = cage.capacity - currentCapacity;
                    const labelState = cage.occupancyStatus === 'disponible' ? 'Disponible' : 'Uso parcial';
                    return (
                      <button
                        key={cage.id}
                        type="button"
                        onClick={() => handleCageSelect(cage)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                      >
                        Jaula #{cage.number} — {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)} ({labelState}, {available} disp.)
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          {selectedCage && (
            <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-sm mt-2 w-fit">
              <span>Jaula #{selectedCage.number} — {selectedCage.type.charAt(0).toUpperCase() + selectedCage.type.slice(1)}</span>
              <button
                type="button"
                onClick={handleCageDeselect}
                className="text-blue-600 hover:text-blue-800 font-bold"
              >
                x
              </button>
            </div>
          )}
          {errors.cageId && <p className="text-red-500 text-sm mt-1">{errors.cageId.message}</p>}
        </div>

        <div>
          <label htmlFor="rabbitSelect" className="block text-sm font-medium mb-2 text-main">Conejos a asignar <span className="text-red-500">*</span></label>
          <div className="relative" ref={rabbitDropdownRef}>
            <Input
              id="rabbitSelect"
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
              <div className="absolute z-50 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-card mt-1 shadow-xl">
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
                  <div key={`rabbit-${id}`} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-sm">
                    <span>{rabbit.name || rabbit.code}</span>
                    <button
                      type="button"
                      onClick={() => handleRabbitToggle(id)}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      x
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
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-md text-center">
          <p className="text-sm text-blue-800 dark:text-blue-400 font-medium">
            Capacidad total: {selectedCage.capacity} | Ya asignados: {currentAssigned}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={selectedRabbits.length === 0 || !selectedCage}>
          {getSubmitLabel()}
        </Button>
      </div>
    </form>
  );
}
