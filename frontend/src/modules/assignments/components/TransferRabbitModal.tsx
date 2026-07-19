'use client';

import { useState, useMemo } from 'react';
import { Dialog, Button, Alert, Input } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useAssignments } from '../hooks/useAssignments';

interface TransferRabbitModalProps {
  open: boolean;
  onClose: () => void;
  rabbitId: number;
  rabbitName: string;
  rabbitCode: string;
  currentCageId: number;
}

export function TransferRabbitModal({ open, onClose, rabbitId, rabbitName, rabbitCode, currentCageId }: Readonly<TransferRabbitModalProps>) {
  const { operativeCages, moveRabbit } = useAssignments();
  const { showToast } = useToast();
  
  const [targetCageId, setTargetCageId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCages = useMemo(() => {
    return operativeCages.filter(c => 
      c.id !== currentCageId && 
      (c.number.toString().includes(search) || c.type.toLowerCase().includes(search.toLowerCase()))
    );
  }, [operativeCages, currentCageId, search]);

  const handleSubmit = async () => {
    if (!targetCageId) {
      setError('Debes seleccionar una jaula de destino.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await moveRabbit({ rabbitId, currentCageId, targetCageId });
      showToast(result.message || 'Conejo movido exitosamente.', 'success');
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(w => showToast(w, 'warning'));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al mover el conejo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Mover Conejo de Jaula" size="md">
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        
        <div>
          <p className="text-sm text-muted mb-2">
            Moviendo a: <strong>{rabbitCode} - {rabbitName}</strong>
          </p>
          <Input 
            placeholder="Buscar jaula destino por número o tipo..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="border border-strong rounded-md max-h-64 overflow-y-auto bg-card shadow-inner">
          {availableCages.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 text-center">No hay otras jaulas operativas disponibles.</p>
          ) : (
            availableCages.map(cage => {
              const currentCapacity = cage.assignedCount || 0;
              const available = cage.capacity - currentCapacity;
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
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-500' : 'hover:bg-theme-hover'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-main">Jaula #{cage.number} — {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)}</div>
                    <div className="text-muted text-xs mt-0.5">Espacio disponible: {available} / {cage.capacity}</div>
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
