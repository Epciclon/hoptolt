'use client';

import { useState } from 'react';
import { Dialog, LoadingMessage, CageGroupCard, RabbitSelectableCard, SelectionActionBar } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useCageSelection } from '@/shared/hooks/useCageSelection';
import { useMortality } from '../hooks/useMortality';
import { MortalityForm } from './MortalityForm';

import { FilterBar } from '@/shared/ui/FilterBar';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface MortalityCatalogProps {
  onSuccess?: () => void;
}

export function MortalityCatalog({ onSuccess }: Readonly<MortalityCatalogProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const { assignedRabbits, loading } = useMortality();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const { can } = usePermissions();
  const canCreate = can('mortality', 'canCreate');

  const {
    selectedRabbitIds,
    toggleRabbit,
    cageGroups,
    paginatedGroups,
    currentPage,
    totalPages,
    setCurrentPage,
    clearSelection,
  } = useCageSelection(assignedRabbits, searchTerm);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    clearSelection();
    onSuccess?.();
  };

  if (loading) {
    return <LoadingMessage message="Cargando mortalidades..." />;
  }

  const selectedRabbitsData = assignedRabbits.filter(r => selectedRabbitIds.includes(r.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full relative z-20 mb-2">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, código o jaula..."
        />
      </div>

      {cageGroups.length === 0 ? (
        <p className="text-sm text-muted">No hay conejos con jaula asignada disponibles para registrar mortalidad.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {paginatedGroups.map((group) => {
              const hasLactatingRabbit = group.rabbits.some(r => (r as any).isLactating);
              return (
                <CageGroupCard
                  key={group.cageNumber}
                  cageNumber={group.cageNumber}
                  cageType={group.cageType}
                  headerBadge={hasLactatingRabbit ? (
                    <span className="px-2.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-medium rounded-full whitespace-nowrap">
                      Lactancia
                    </span>
                  ) : undefined}
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
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {selectedRabbitIds.length > 0 && (
        canCreate ? (
          <SelectionActionBar
            count={selectedRabbitIds.length}
            itemName="conejo"
            buttonText="Registrar Baja"
            mobileButtonText="Baja"
            onRegister={() => setIsFormModalOpen(true)}
          />
        ) : (
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-theme-surface border border-strong shadow-lg rounded-xl px-4 py-2 text-xs text-muted font-medium">
            Solo consulta
          </div>
        )
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
