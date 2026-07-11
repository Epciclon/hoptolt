'use client';

import { useState, useMemo } from 'react';
import { Button, Dialog, LoadingMessage, CageGroupCard, RabbitSelectableCard } from '@/shared/ui';
import { groupRabbitsByCage } from '@/shared/utils/rabbitUtils';
import { useMortality } from '../hooks/useMortality';
import { MortalityForm } from './MortalityForm';

interface MortalityCatalogProps {
  onSuccess?: () => void;
}

export function MortalityCatalog({ onSuccess }: Readonly<MortalityCatalogProps>) {
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

  const cageGroups = useMemo(() => {
    const grouped = groupRabbitsByCage(assignedRabbits);
    return Object.values(grouped).sort((a, b) => a.cageNumber - b.cageNumber);
  }, [assignedRabbits]);

  if (loading) {
    return <LoadingMessage message="Cargando mortalidades..." />;
  }

  const selectedRabbitsData = assignedRabbits.filter(r => selectedRabbitIds.includes(r.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end mb-2">
        {assignedRabbits.length > 0 && (
          <Button 
            type="button" 
            variant={selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0 ? 'success' : 'outline'}
            size="sm" 
            onClick={selectAllRabbits}
          >
            {selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </Button>
        )}
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-slate-500">No hay conejos con jaula asignada disponibles para registrar mortalidad.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cageGroups.map((group) => (
            <CageGroupCard
              key={group.cageNumber}
              cageNumber={group.cageNumber}
              cageType={group.cageType}
            >
              {group.rabbits.map((rabbit) => (
                <RabbitSelectableCard
                  key={rabbit.id}
                  rabbit={rabbit}
                  isSelected={selectedRabbitIds.includes(rabbit.id)}
                  onClick={() => toggleRabbit(rabbit.id)}
                />
              ))}
            </CageGroupCard>
          ))}
        </div>
      )}

      {selectedRabbitIds.length > 0 && (
        <div className="flex justify-end pt-4 mt-6 border-t border-slate-200">
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
