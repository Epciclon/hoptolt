'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert, Input, LoadingMessage, RabbitSelectableCard } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';

import { useAssignments } from '../hooks/useAssignments';
import { assignmentToCompatibilityRabbit, validateCageCompatibility } from '../utils/compatibility';
import type { Assignment } from '../types/assignment.types';
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
  const {
    assignRabbits,
    assignments,
    operativeCages: cages,
    availableRabbits: rabbits,
    loading: loadingData,
  } = useAssignments();
  const { showToast } = useToast();

  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedRabbits, setSelectedRabbits] = useState<number[]>([]);
  const [selectedCage, setSelectedCage] = useState<Cage | null>(null);
  const [cageSearch, setCageSearch] = useState('');
  const [rabbitSearch, setRabbitSearch] = useState('');

  const { handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rabbitIds: [] },
  });

  const occupantsByCageId = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    for (const assignment of assignments) {
      if (assignment.status !== 'asignado') continue;
      const list = map.get(assignment.cageId) ?? [];
      list.push(assignment);
      map.set(assignment.cageId, list);
    }
    return map;
  }, [assignments]);

  const liveSelectedCage = useMemo(() => {
    if (!selectedCage) return null;
    return cages.find((c) => c.id === selectedCage.id) ?? selectedCage;
  }, [cages, selectedCage]);

  const currentOccupants = useMemo(() => {
    if (!liveSelectedCage) return [];
    return occupantsByCageId.get(liveSelectedCage.id) ?? [];
  }, [liveSelectedCage, occupantsByCageId]);

  const existingOccupantRabbits = useMemo(
    () => currentOccupants.map(assignmentToCompatibilityRabbit),
    [currentOccupants],
  );

  const selectedRabbitObjects = useMemo(
    () =>
      selectedRabbits
        .map((id) => rabbits.find((r) => r.id === id))
        .filter((r): r is Rabbit => Boolean(r)),
    [selectedRabbits, rabbits],
  );

  const liveOccupiedCount = useMemo(() => {
    if (!liveSelectedCage) return 0;
    return currentOccupants.length > 0
      ? currentOccupants.length
      : (liveSelectedCage.assignedCount || 0);
  }, [liveSelectedCage, currentOccupants.length]);

  const groupValidation = useMemo(() => {
    if (!liveSelectedCage || selectedRabbitObjects.length === 0) {
      return { compatible: true, reasons: [] as string[] };
    }
    return validateCageCompatibility(
      {
        id: liveSelectedCage.id,
        number: liveSelectedCage.number,
        type: liveSelectedCage.type,
        capacity: liveSelectedCage.capacity,
        assignedCount: liveOccupiedCount,
      },
      selectedRabbitObjects,
      existingOccupantRabbits,
    );
  }, [liveSelectedCage, liveOccupiedCount, selectedRabbitObjects, existingOccupantRabbits]);

  const evaluateCandidate = (rabbit: Rabbit) => {
    if (!liveSelectedCage) {
      return { compatible: true, reasons: [] as string[] };
    }
    const spaceLeft = Math.max(0, liveSelectedCage.capacity - liveOccupiedCount);

    if (spaceLeft === 0) {
      return {
        compatible: false,
        reasons: ['La jaula ya alcanzó su capacidad máxima.'],
      };
    }

    if (spaceLeft === 1 && selectedRabbits.length === 1) {
      return validateCageCompatibility(
        {
          id: liveSelectedCage.id,
          number: liveSelectedCage.number,
          type: liveSelectedCage.type,
          capacity: liveSelectedCage.capacity,
          assignedCount: liveOccupiedCount,
        },
        [rabbit],
        existingOccupantRabbits,
      );
    }

    if (selectedRabbits.length >= spaceLeft) {
      return {
        compatible: false,
        reasons: ['Ya alcanzaste la capacidad disponible de esta jaula.'],
      };
    }

    return validateCageCompatibility(
      {
        id: liveSelectedCage.id,
        number: liveSelectedCage.number,
        type: liveSelectedCage.type,
        capacity: liveSelectedCage.capacity,
        assignedCount: liveOccupiedCount,
      },
      [...selectedRabbitObjects, rabbit],
      existingOccupantRabbits,
    );
  };

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
    if (!groupValidation.compatible) {
      showToast(groupValidation.reasons.join(' ') || 'La selección no cumple las reglas de esta jaula.', 'error');
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
    if (!liveSelectedCage) return;

    const isAdding = !selectedRabbits.includes(id);

    if (isAdding) {
      const spaceLeft = Math.max(0, liveSelectedCage.capacity - liveOccupiedCount);

      if (spaceLeft === 0) {
        showToast('La jaula ya alcanzó su capacidad máxima.', 'error');
        return;
      }

      if (selectedRabbits.length >= spaceLeft && spaceLeft > 1) {
        showToast('Ya alcanzaste la capacidad disponible de esta jaula.', 'error');
        return;
      }

      const candidate = rabbits.find((r) => r.id === id);
      if (candidate) {
        const validation = evaluateCandidate(candidate);
        if (!validation.compatible) {
          showToast(validation.reasons.join(' '), 'error');
          return;
        }
      }

      if (selectedRabbits.length >= spaceLeft) {
        const updated = [...selectedRabbits.slice(0, -1), id];
        setSelectedRabbits(updated);
        setValue('rabbitIds', updated);
      } else {
        const updated = [...selectedRabbits, id];
        setSelectedRabbits(updated);
        setValue('rabbitIds', updated);
      }
    } else {
      const updated = selectedRabbits.filter((r) => r !== id);
      setSelectedRabbits(updated);
      setValue('rabbitIds', updated);
    }
  };

  const handleRabbitSelect = (rabbit: Rabbit) => {
    const isAdding = !selectedRabbits.includes(rabbit.id);
    if (isAdding) {
      const validation = evaluateCandidate(rabbit);
      if (!validation.compatible) {
        showToast(validation.reasons.join(' '), 'error');
        return;
      }
    }
    handleRabbitToggle(rabbit.id);
    setRabbitSearch('');
  };

  const handleCageSelect = (cage: Cage) => {
    setSelectedCage(cage);
    setValue('cageId', cage.id);
    setCageSearch('');
  };

  const handleCageDeselect = () => {
    setSelectedCage(null);
    setValue('cageId', undefined);
    setSelectedRabbits([]);
    setValue('rabbitIds', []);
  };

  const filteredCages = cages.filter((c) => {
    const occupants = occupantsByCageId.get(c.id) ?? [];
    const currentCapacity = occupants.length > 0 ? occupants.length : (c.assignedCount || 0);
    const hasSpace = currentCapacity < c.capacity;
    const matchesSearch =
      c.number.toString().includes(cageSearch) ||
      c.type.toLowerCase().includes(cageSearch.toLowerCase());
    const notSelected = !selectedCage || c.id !== selectedCage.id;
    return hasSpace && matchesSearch && notSelected;
  });

  const filteredRabbits = rabbits.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(rabbitSearch.toLowerCase()) ||
      r.name?.toLowerCase().includes(rabbitSearch.toLowerCase());
    const notSelected = !selectedRabbits.includes(r.id);
    return matchesSearch && notSelected;
  });

  const evaluatedCandidates = filteredRabbits.map((rabbit) => ({
    rabbit,
    check: evaluateCandidate(rabbit),
  }));
  const orderedCandidates = [
    ...evaluatedCandidates.filter((item) => item.check.compatible),
    ...evaluatedCandidates.filter((item) => !item.check.compatible),
  ];

  if (loadingData) {
    return <LoadingMessage message="Cargando jaulas y conejos disponibles..." />;
  }

  const getSubmitLabel = () => {
    if (selectedRabbits.length === 0) return 'Asignar';
    return `Asignar (${selectedRabbits.length})`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 min-h-[400px]">
      {warnings.length > 0 && (
        <Alert
          variant="warning"
          message={warnings.join(' ')}
          onClose={() => setWarnings([])}
        />
      )}

      {!liveSelectedCage ? (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-main">Paso 1: Selecciona una jaula destino</h3>
          </div>
          <Input
            id="cageSelect"
            placeholder="Busca por número o tipo de jaula..."
            value={cageSearch}
            onChange={(e) => setCageSearch(e.target.value)}
          />
          <div className="border border-strong rounded-md overflow-y-auto bg-card shadow-inner max-h-48 sm:max-h-64 xl:max-h-80 mt-2">
            {filteredCages.length === 0 ? (
              <p className="text-muted text-sm p-4 text-center">No se encontraron jaulas con espacio disponible.</p>
            ) : (
              filteredCages.map((cage) => {
                const occupants = occupantsByCageId.get(cage.id) ?? [];
                const currentCapacity = occupants.length > 0 ? occupants.length : (cage.assignedCount || 0);
                const available = cage.capacity - currentCapacity;
                return (
                  <button
                    key={cage.id}
                    type="button"
                    onClick={() => handleCageSelect(cage)}
                    className="w-full text-left px-3 py-3 border-b border-strong last:border-b-0 text-sm transition-colors flex items-center justify-between hover:bg-theme-hover"
                  >
                    <div>
                      <div className="font-semibold text-main">
                        Jaula {cage.number} - {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)}
                      </div>
                      <div className="text-muted text-xs mt-0.5">
                        Espacio disponible: {available} / {cage.capacity}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {errors.cageId && <p className="text-red-500 text-sm mt-1">{errors.cageId.message}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
          {/* Header con botón de volver */}
          <div className="flex items-center gap-3 border-b border-strong pb-3">
            <button
              type="button"
              onClick={handleCageDeselect}
              className="flex items-center justify-center p-2 rounded-full hover:bg-theme-hover text-muted hover:text-main transition-colors"
              title="Volver a seleccionar jaula"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-main">Jaula {liveSelectedCage.number}</h3>
            <span className="text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-md ml-auto">
              {liveOccupiedCount} / {liveSelectedCage.capacity} ocupados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda: Inventario de Conejos */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-main">Selecciona los conejos</h3>
              </div>
              <Input
                id="rabbitSelect"
                placeholder="Buscar conejo por código o nombre..."
                value={rabbitSearch}
                onChange={(e) => setRabbitSearch(e.target.value)}
              />

              <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: '60vh' }}>
                {orderedCandidates.length === 0 ? (
                  <p className="text-muted text-sm col-span-full">No hay conejos disponibles que coincidan con la búsqueda.</p>
                ) : (
                  orderedCandidates.map(({ rabbit, check }) => (
                    <div key={rabbit.id} className={check.compatible ? 'w-full' : 'w-full opacity-60'}>
                      <RabbitSelectableCard
                        rabbit={rabbit}
                        isSelected={selectedRabbits.includes(rabbit.id)}
                        onClick={() => handleRabbitSelect(rabbit)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna Derecha: Ocupantes actuales + La Jaula y Guardar (Carrito) */}
            <div className="flex flex-col gap-4">
              <div className="border border-strong rounded-xl bg-card overflow-hidden shadow-sm flex flex-col h-full" style={{ maxHeight: 'calc(60vh + 100px)' }}>
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                  {/* Lista de conejos seleccionados */}
                  <div>
                    <h4 className="text-sm font-semibold text-main mb-3">Conejos a asignar:</h4>
                    {selectedRabbits.length === 0 ? (
                      <p className="text-xs text-muted italic">Aún no has seleccionado conejos de la lista.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedRabbits.map((id) => {
                          const rabbit = rabbits.find((r) => r.id === id);
                          if (!rabbit) return null;
                          return (
                            <RabbitSelectableCard
                              key={`rabbit-${id}`}
                              rabbit={rabbit}
                              isSelected={false}
                              onRemove={() => handleRabbitToggle(id)}
                            />
                          );
                        })}
                      </div>
                    )}
                    {errors.rabbitIds && <p className="text-red-500 text-sm mt-3">{errors.rabbitIds.message}</p>}
                  </div>

                  {currentOccupants.length > 0 && (
                    <div className="pt-4 border-t border-strong">
                      <h4 className="text-sm font-semibold text-main mb-3">
                        Viven actualmente en esta jaula:
                      </h4>
                      <div className="flex flex-col gap-2">
                        {currentOccupants.map((occ) => (
                          <RabbitSelectableCard
                            key={`occupant-${occ.id}`}
                            rabbit={{
                              id: occ.rabbitId,
                              code: occ.rabbitCode || '',
                              name: occ.rabbitName,
                              imageUrl: occ.photoUrl,
                              age: occ.rabbitAge,
                              weight: occ.rabbitWeight,
                              race: occ.rabbitRace,
                            }}
                            isSelected={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Guardar */}
                <div className="p-4 border-t border-strong bg-theme-hover flex flex-col gap-2">
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={selectedRabbits.length === 0 || !groupValidation.compatible}
                    className="w-full"
                  >
                    {getSubmitLabel()}
                  </Button>
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full">
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
