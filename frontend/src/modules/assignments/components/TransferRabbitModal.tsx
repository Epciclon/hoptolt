'use client';

import { useState, useMemo } from 'react';
import { Dialog, Button, Input } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useAssignments } from '../hooks/useAssignments';

interface TransferRabbitModalProps {
  open: boolean;
  onClose: () => void;
  rabbits: { id: number; name: string; code: string; age?: number; purpose?: string }[];
  currentCageId: number;
  sourceCageType: string;
}

export function TransferRabbitModal({ open, onClose, rabbits, currentCageId, sourceCageType }: Readonly<TransferRabbitModalProps>) {
  const { operativeCages, moveRabbit, moveRabbits } = useAssignments();
  const { showToast } = useToast();
  
  const [targetCageId, setTargetCageId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasRabbitOver3Months = rabbits.some(r => r.age !== undefined && r.age > 3);
  const hasEngordeRabbit = rabbits.some(r => r.purpose === 'Engorde');

  const availableCages = useMemo(() => {
    return operativeCages.filter(c => {
      if (c.id === currentCageId) return false;
      
      const matchesSearch = c.number.toString().includes(search) || c.type.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Reglas de negocio basadas en las propiedades de los conejos
      
      // 1. A jaulas de reproducción: no pueden ir de propósito 'Engorde', y máximo 1 a la vez.
      if (c.type === 'reproducción') {
        if (hasEngordeRabbit) return false;
        if (rabbits.length > 1) return false;
      }

      // 2. A jaulas de engorde: no pueden ir mayores de 3 meses.
      if (c.type === 'engorde') {
        if (hasRabbitOver3Months) return false;
      }

      return true;
    });
  }, [operativeCages, currentCageId, search, sourceCageType, hasRabbitOver3Months, hasEngordeRabbit, rabbits.length]);

  const handleSubmit = async () => {
    if (!targetCageId) {
      showToast('Debes seleccionar una jaula de destino.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (rabbits.length === 1) {
        const result = await moveRabbit({ rabbitId: rabbits[0].id, currentCageId, targetCageId }) as any;
        showToast(result.message || 'Conejo movido exitosamente.', 'success');
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((w: string) => showToast(w, 'warning'));
        }
      } else {
        const result = await moveRabbits({ rabbitIds: rabbits.map(r => r.id), currentCageId, targetCageId }) as any;
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
        <div className="p-4 flex flex-col gap-4">
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

  return (
    <Dialog open={open} onClose={onClose} title={rabbits.length === 1 ? "Mover Conejo de Jaula" : `Mover ${rabbits.length} Conejos`} size="md">
      <div className="flex flex-col gap-4">
        
        <div>
          <p className="text-sm text-muted mb-2">
            Moviendo a:{' '}
            {rabbits.length === 1 ? (
              <strong>{rabbits[0].code} - {rabbits[0].name}</strong>
            ) : (
              <strong>{rabbits.length} conejos seleccionados</strong>
            )}
          </p>
          <Input 
            placeholder="Buscar jaula destino por número o tipo..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="border border-strong rounded-md max-h-64 overflow-y-auto bg-card shadow-inner">
          {availableCages.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 text-center">No hay otras jaulas operativas compatibles disponibles.</p>
          ) : (
            availableCages.map(cage => {
              const currentCapacity = cage.assignedCount || 0;
              const isSelected = targetCageId === cage.id;
              
              let labelState = 'Disponible';
              let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
              
              if (currentCapacity >= cage.capacity) {
                labelState = 'Llena';
                badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
              } else if (currentCapacity > 0) {
                labelState = 'Uso parcial';
                badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
              }

              return (
                <button
                  key={cage.id}
                  type="button"
                  onClick={() => setTargetCageId(cage.id)}
                  className={`w-full text-left px-3 py-3 border-b border-strong last:border-b-0 text-sm transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-inset ring-green-500' : 'hover:bg-theme-hover'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-main">Jaula #{cage.number} — {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                    {labelState}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!targetCageId}>
            Confirmar Movimiento
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
