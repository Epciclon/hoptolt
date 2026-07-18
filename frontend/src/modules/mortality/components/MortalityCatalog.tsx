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
      {cageGroups.length === 0 ? (
        <p className="text-sm text-muted">No hay conejos con jaula asignada disponibles para registrar mortalidad.</p>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 shadow-xl border-2 border-primary-500 bg-theme-surface p-3 rounded-2xl flex items-center justify-between gap-6 max-w-[90vw] min-w-[300px]">
          <span className="text-main font-semibold px-2">{selectedRabbitIds.length} conejo{selectedRabbitIds.length !== 1 ? 's' : ''} seleccionado{selectedRabbitIds.length !== 1 ? 's' : ''}</span>
          <Button
            onClick={() => setIsFormModalOpen(true)}
            variant="primary"
          >
            Registrar Baja
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
