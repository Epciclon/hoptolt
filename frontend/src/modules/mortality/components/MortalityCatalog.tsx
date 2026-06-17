'use client';

import { useState } from 'react';
import { Button, Dialog } from '@/shared/ui';
import { useMortality } from '../hooks/useMortality';
import { MortalityForm } from './MortalityForm';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface MortalityCatalogProps {
  onSuccess?: () => void;
}

export function MortalityCatalog({ onSuccess }: MortalityCatalogProps) {
  const { assignedRabbits, loading } = useMortality();

  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

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

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    setSelectedRabbitIds([]);
    onSuccess?.();
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
  }, {} as Record<number, { cageNumber: number; cageType: string; cageId: number; rabbits: AssignedRabbit[] }>);

  const cageGroups = Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);

  if (loading) {
    return <p className="text-center text-slate-500 py-8">Cargando datos del catálogo...</p>;
  }

  const selectedRabbitsData = assignedRabbits.filter(r => selectedRabbitIds.includes(r.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {assignedRabbits.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={selectAllRabbits}>
            {selectedRabbitIds.length === assignedRabbits.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </Button>
        )}
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-slate-500">No hay conejos con jaula asignada disponibles para registrar mortalidad.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cageGroups.map(group => (
            <div
              key={group.cageNumber}
              className="border rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800">
                  Jaula #{group.cageNumber} — {group.cageType.charAt(0).toUpperCase() + group.cageType.slice(1)}
                </h4>
              </div>
              <div className="p-3 space-y-2">
                {group.rabbits.map(rabbit => {
                  const isSelected = selectedRabbitIds.includes(rabbit.id);
                  return (
                    <div
                      key={rabbit.id}
                      onClick={() => toggleRabbit(rabbit.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {rabbit.code}{rabbit.name ? ` — ${rabbit.name}` : ''}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {rabbit.age} meses • {rabbit.weight} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRabbitIds.length > 0 && (
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-200 z-10 mt-6 animate-in slide-in-from-bottom duration-300">
          <Button 
            onClick={() => setIsFormModalOpen(true)}
          >
            Registrar Baja ({selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''})
          </Button>
        </div>
      )}

      {/* Formulario Principal de Mortalidad en modal Dialog */}
      <Dialog
        open={isFormModalOpen}
        onClose={handleCloseFormModal}
        title="Registrar Mortalidad"
        description="Ingresa los datos para registrar la baja de los conejos"
        size="lg"
      >
        {isFormModalOpen && (
          <MortalityForm 
            selectedRabbits={selectedRabbitsData} 
            onSuccess={handleFormSuccess} 
            onCancel={handleCloseFormModal}
          />
        )}
      </Dialog>
    </div>
  );
}
