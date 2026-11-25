'use client';

import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, Button, Input, Select } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useAssignments } from '../hooks/useAssignments';
import {
  assignmentToCompatibilityRabbit,
  getRabbitAgeInMonths,
  validateCageCompatibility,
} from '../utils/compatibility';

interface TransferRabbitModalProps {
  open: boolean;
  onClose: () => void;
  rabbits: {
    id: number;
    name: string;
    code: string;
    sex?: string;
    age?: number;
    birthDate?: string;
    purpose?: string;
  }[];
  currentCageId: number;
  sourceCageType: string;
}

type CageTypeFilter = '' | 'engorde' | 'reproducción';

function getSexBadgeInfo(sex?: string) {
  const normalized = sex?.trim().toLowerCase();
  if (normalized === 'macho') {
    return {
      label: 'Macho',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };
  }
  if (normalized === 'hembra') {
    return {
      label: 'Hembra',
      className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    };
  }
  return null;
}

export function TransferRabbitModal({
  open,
  onClose,
  rabbits,
  currentCageId,
  sourceCageType,
}: Readonly<TransferRabbitModalProps>) {
  const { operativeCages, assignments, moveRabbit, moveRabbits } = useAssignments();
  const { showToast } = useToast();

  const [targetCageId, setTargetCageId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [cageTypeFilter, setCageTypeFilter] = useState<CageTypeFilter>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasRabbitOver3Months = rabbits.some((r) => {
    const age = getRabbitAgeInMonths(r);
    return age !== null && age > 3.1;
  });
  const hasEngordeRabbit = rabbits.some((r) => r.purpose === 'Engorde');

  const occupantsByCageId = useMemo(() => {
    const map = new Map<number, typeof assignments>();
    for (const a of assignments) {
      if (a.status !== 'asignado') continue;
      const list = map.get(a.cageId) ?? [];
      list.push(a);
      map.set(a.cageId, list);
    }
    return map;
  }, [assignments]);

  const compatibleCages = useMemo(() => {
    const normalizedSourceType = sourceCageType.toLowerCase();

    const evaluated = operativeCages
      .filter((c) => {
        if (c.id === currentCageId) return false;
        const matchesType =
          !cageTypeFilter || c.type.toLowerCase() === cageTypeFilter;
        if (!matchesType) return false;

        const matchesSearch =
          c.number.toString().includes(search) ||
          c.type.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
      })
      .map((cage) => {
        const occupants = occupantsByCageId.get(cage.id) ?? [];
        const occupiedCount =
          occupants.length > 0 ? occupants.length : (cage.assignedCount || 0);
        const existingRabbits = occupants.map(assignmentToCompatibilityRabbit);
        const check = validateCageCompatibility(
          {
            id: cage.id,
            number: cage.number,
            type: cage.type,
            capacity: cage.capacity,
            assignedCount: occupiedCount,
          },
          rabbits,
          existingRabbits,
          { isMove: true },
        );
        return { cage, occupants, occupiedCount, check };
      });

    const sortFn = (a: (typeof evaluated)[number], b: (typeof evaluated)[number]) => {
      const aMatchesSource = a.cage.type.toLowerCase() === normalizedSourceType ? 0 : 1;
      const bMatchesSource = b.cage.type.toLowerCase() === normalizedSourceType ? 0 : 1;
      if (aMatchesSource !== bMatchesSource) return aMatchesSource - bMatchesSource;

      const isEmptyA = a.occupiedCount === 0 ? 0 : 1;
      const isEmptyB = b.occupiedCount === 0 ? 0 : 1;
      if (isEmptyA !== isEmptyB) return isEmptyA - isEmptyB;

      return (a.cage.number || 0) - (b.cage.number || 0);
    };

    return evaluated.filter((e) => e.check.compatible).sort(sortFn);
  }, [operativeCages, currentCageId, search, cageTypeFilter, occupantsByCageId, rabbits, sourceCageType]);

  const isSelectedCageStillCompatible = useMemo(
    () => targetCageId !== null && compatibleCages.some((item) => item.cage.id === targetCageId),
    [targetCageId, compatibleCages],
  );

  useEffect(() => {
    if (targetCageId !== null && !isSelectedCageStillCompatible) {
      setTargetCageId(null);
    }
  }, [targetCageId, isSelectedCageStillCompatible]);

  const handleSubmit = async () => {
    if (!targetCageId || !isSelectedCageStillCompatible) {
      showToast('Debes seleccionar una jaula de destino compatible.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (rabbits.length === 1) {
        const result = (await moveRabbit({
          rabbitId: rabbits[0].id,
          currentCageId,
          targetCageId,
        })) as any;
        showToast(result.message || 'Conejo movido exitosamente.', 'success');
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((w: string) => showToast(w, 'warning'));
        }
      } else {
        const result = (await moveRabbits({
          rabbitIds: rabbits.map((r) => r.id),
          currentCageId,
          targetCageId,
        })) as any;
        showToast(result.message || 'Conejos movidos exitosamente.', 'success');
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((w: string) => showToast(w, 'warning'));
        }
      }
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al mover los conejos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompletelyBlocked = hasRabbitOver3Months && hasEngordeRabbit;

  if (isCompletelyBlocked) {
    return (
      <Dialog open={open} onClose={onClose} title="Movimiento No Permitido" size="md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Has seleccionado al menos un conejo de Engorde mayor a 3 meses de edad. El sistema no permite transferir conejos mayores de 3 meses a otras jaulas de engorde grupales debido a que alcanzan la madurez sexual y muestran comportamientos territoriales. Además, por su propósito, no pueden ir a jaulas de reproducción.
          </p>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
            <strong>Acción sugerida:</strong> Si el conejo es pie de cría (Reproducción), cámbiale el propósito desde su perfil para poder asignarlo a una jaula individual. Si es de engorde puro, ya está listo para salir del ciclo (venta o sacrificio).
          </p>
          <div className="flex justify-end mt-2">
            <Button variant="outline" onClick={onClose}>Entendido</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  const singleRabbit = rabbits.length === 1 ? rabbits[0] : null;
  const singleSexBadge = singleRabbit ? getSexBadgeInfo(singleRabbit.sex) : null;

  const renderOccupantsBlock = (occupants: typeof assignments) => {
    if (occupants.length === 0) return null;
    return (
      <div className="w-full pt-2 border-t border-default/60 space-y-1.5">
        <p className="text-xs font-semibold text-muted">Ocupantes actuales:</p>
        <div className="flex flex-col gap-1">
          {occupants.map((occ) => {
            const sexBadge = getSexBadgeInfo(occ.rabbitSex);
            const displayName = occ.rabbitName
              ? `${occ.rabbitName} - ${occ.rabbitCode || ''}`
              : (occ.rabbitCode || `Conejo ${occ.rabbitId}`);
            const ageText =
              occ.rabbitAge !== undefined
                ? `${occ.rabbitAge} ${occ.rabbitAge === 1 ? 'mes' : 'meses'}`
                : null;

            return (
              <div
                key={occ.id}
                className="flex flex-wrap items-center justify-between gap-1.5 text-xs bg-theme-surface/70 rounded px-2 py-1"
              >
                <span className="font-medium text-main truncate max-w-[55%]">{displayName}</span>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {sexBadge && (
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${sexBadge.className}`}>
                      {sexBadge.label}
                    </span>
                  )}
                  {occ.rabbitPurpose && (
                    <span className="px-1.5 py-0.5 rounded-full font-medium bg-card border border-default text-muted">
                      {occ.rabbitPurpose}
                    </span>
                  )}
                  {ageText && <span className="text-muted">{ageText}</span>}
                  {occ.rabbitRace && <span className="text-muted capitalize">• {occ.rabbitRace}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rabbits.length === 1 ? 'Mover Conejo de Jaula' : `Mover ${rabbits.length} Conejos`}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-2.5">
          <div>
            <p className="text-sm text-muted">
              Moviendo a:{' '}
              {singleRabbit ? (
                <strong>
                  {singleRabbit.name ? `${singleRabbit.name} - ${singleRabbit.code}` : singleRabbit.code}
                </strong>
              ) : (
                <strong>{rabbits.length} conejos seleccionados</strong>
              )}
            </p>
            {singleRabbit ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs">
                {singleSexBadge && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${singleSexBadge.className}`}>
                    {singleSexBadge.label}
                  </span>
                )}
                {singleRabbit.purpose && (
                  <span className="px-2 py-0.5 rounded-full font-medium bg-theme-surface text-muted border border-default">
                    {singleRabbit.purpose}
                  </span>
                )}
                {singleRabbit.age !== undefined && (
                  <span className="text-muted">
                    {singleRabbit.age} {singleRabbit.age === 1 ? 'mes' : 'meses'}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-muted">
                <span>Propósitos: {Array.from(new Set(rabbits.map((r) => r.purpose).filter(Boolean))).join(', ') || 'No definido'}</span>
                <span>•</span>
                <span>Sexos: {Array.from(new Set(rabbits.map((r) => r.sex).filter(Boolean))).join(', ') || 'No definido'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1">
              <Input
                placeholder="Buscar jaula destino por número o tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-44 relative">
              <Select
                placeholder="Filtrar por tipo"
                value={cageTypeFilter}
                onChange={(e) => setCageTypeFilter(e.target.value as CageTypeFilter)}
                className={cageTypeFilter ? 'pr-12' : ''}
                options={[
                  { value: 'engorde', label: 'Engorde' },
                  { value: 'reproducción', label: 'Reproducción' },
                ]}
              />
              {cageTypeFilter && (
                <button
                  type="button"
                  onClick={() => setCageTypeFilter('')}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-1 text-theme-faint hover:text-red-500 rounded-full transition-colors flex items-center justify-center bg-card"
                  title="Limpiar"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted">
            Solo se muestran jaulas compatibles según espacio disponible, propósito, sexo y edad.
          </p>
        </div>

        <div className="border border-strong rounded-md max-h-64 sm:max-h-80 overflow-y-auto bg-card shadow-inner">
          {compatibleCages.length === 0 ? (
            <p className="text-muted text-sm p-4 text-center">
              No hay otras jaulas operativas compatibles según las reglas de movimiento.
            </p>
          ) : (
            compatibleCages.map(({ cage, occupants, occupiedCount }) => {
              const isSelected = targetCageId === cage.id;
              const isFullEmpty = occupiedCount === 0;
              const labelState = isFullEmpty
                ? `Disponible · 0/${cage.capacity}`
                : `Parcial · ${occupiedCount}/${cage.capacity}`;
              const badgeColor = isFullEmpty
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';

              return (
                <button
                  key={cage.id}
                  type="button"
                  onClick={() => setTargetCageId(cage.id)}
                  className={`w-full text-left px-3.5 py-2.5 border-b border-strong last:border-b-0 text-sm transition-colors flex flex-col gap-2 ${
                    isSelected ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-inset ring-green-500' : 'hover:bg-theme-hover'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-main leading-snug">Jaula {cage.number}</span>
                      <span className="text-xs text-muted font-medium capitalize mt-0.5">{cage.type}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 whitespace-nowrap ${badgeColor}`}>
                      {labelState}
                    </span>
                  </div>
                  {renderOccupantsBlock(occupants)}
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!targetCageId || !isSelectedCageStillCompatible}
          >
            Confirmar Movimiento
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
