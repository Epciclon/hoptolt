'use client';

import { useRabbits } from '../hooks/useRabbits';
import { useRaces } from '../../races/hooks/useRaces';
import type { Rabbit } from '../types/rabbit.types';
import { Button, ConfirmDialog, Dialog, Badge, LoadingMessage, CatalogCard } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import { useState } from 'react';
import { Pencil, Trash2, Info } from 'lucide-react';
import { RabbitForm } from './RabbitForm';
import { RabbitDetailsModal } from './RabbitDetailsModal';
import { useToast } from '@/shared/contexts/ToastContext';
import { useSupabase } from '../../../hooks/useSupabase';
import { formatRabbitAge, rabbitSexOptions } from '@/shared/utils/rabbitUtils';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface RabbitCatalogProps {
  onSuccess?: () => void;
}

export function RabbitCatalog({ onSuccess }: Readonly<RabbitCatalogProps>) {
  const { rabbits, pagination, loading, fetchRabbits, deleteRabbit, setPage, setSearch, setRace, setSex, setPurpose, filters } = useRabbits();
  const { races } = useRaces();
  const { showToast } = useToast();
  const { deleteRabbitImage } = useSupabase();
  const { can } = usePermissions();
  const canUpdate = can('rabbits', 'canUpdate');
  const canDelete = can('rabbits', 'canDelete');

  const [selectedRabbitId, setSelectedRabbitId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Rabbit | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingRabbit, setEditingRabbit] = useState<Rabbit | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [detailsRabbit, setDetailsRabbit] = useState<Rabbit | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const toggleRabbitSelection = (rabbitId: number) => {
    setSelectedRabbitId(prev => prev === rabbitId ? null : rabbitId);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete?.id) return;
    setDeleting(true);
    const { success, error: deleteError } = await deleteRabbit(toDelete.id);
    setDeleting(false);

    if (success) {
      if (toDelete.imageUrl) {
        const encodedFileName = toDelete.imageUrl.split('/').pop();
        if (encodedFileName) {
          const decodedFileName = decodeURIComponent(encodedFileName);
          await deleteRabbitImage(decodedFileName).catch(console.error);
        }
      }
      setToDelete(null);
      showToast(`Conejo "${toDelete.code}" eliminado correctamente.`, 'success');
      onSuccess?.();
    } else {
      showToast(deleteError || 'Error al eliminar el conejo.', 'error');
    }
  };

  const raceOptions = races.map(r => ({ label: r.name, value: r.name }));
  const purposeOptions = [
    { label: 'Reproducción', value: 'Reproducción' },
    { label: 'Engorde', value: 'Engorde' }
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <FilterBar
        searchValue={filters.search || ''}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Buscar por código o nombre..."
        filters={[
          { key: 'race', placeholder: 'Todas las Razas', options: raceOptions, value: filters.race || '', onChange: (val) => { setRace(val); setPage(1); } },
          { key: 'sex', placeholder: 'Cualquier Sexo', options: rabbitSexOptions, value: filters.sex || '', onChange: (val) => { setSex(val); setPage(1); } },
          { key: 'purpose', placeholder: 'Todo Propósito', options: purposeOptions, value: filters.purpose || '', onChange: (val) => { setPurpose(val); setPage(1); } }
        ]}
      />

      {loading && (
        <LoadingMessage message="Cargando conejos..." />
      )}
      {!loading && rabbits.length === 0 && (
        <p className="text-sm text-muted text-center py-8 bg-theme-surface rounded-lg border border-strong">No hay conejos registrados con esos filtros.</p>
      )}
      {!loading && rabbits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {rabbits.map((rabbit) => {
            const isSelected = selectedRabbitId === rabbit.id;
            return (
              <CatalogCard
                key={rabbit.id}
                imageUrl={rabbit.imageUrl}
                imageAlt={rabbit.name || rabbit.code}
                badge={rabbit.code}
                title={rabbit.name || 'Sin nombre'}
                subtitle={rabbit.race}
                isSelected={isSelected}
                onClick={() => toggleRabbitSelection(rabbit.id)}
                topRightAction={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsRabbit(rabbit);
                      setShowDetailsModal(true);
                    }}
                    className="bg-slate-900/70 hover:bg-slate-900 text-white p-1.5 rounded-md shadow-sm backdrop-blur-sm transition-colors"
                    title="Ver Detalles e Historial Médico"
                  >
                    <Info size={16} />
                  </button>
                }
                tags={
                  <>
                    <Badge variant={rabbit.sex === 'macho' ? 'primary' : 'success'}>
                      {rabbit.sex.charAt(0).toUpperCase() + rabbit.sex.slice(1)}
                    </Badge>
                    <Badge variant="neutral">
                      {rabbit.purpose}
                    </Badge>
                  </>
                }
                details={
                  <div className="grid grid-cols-2 divide-x divide-default/80 bg-theme-surface border border-default/70 rounded-lg py-2 px-1 w-full shadow-inner text-center">
                    <div className="flex flex-col items-center justify-center px-1 min-w-0">
                      <span className="text-[11px] text-muted font-medium uppercase tracking-wider leading-none">
                        Edad
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-main mt-1 truncate max-w-full">
                        {formatRabbitAge(rabbit.age)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-1 min-w-0">
                      <span className="text-[11px] text-muted font-medium uppercase tracking-wider leading-none">
                        Peso
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-main mt-1 truncate max-w-full">
                        {rabbit.weight !== undefined && rabbit.weight !== null ? `${rabbit.weight} kg` : '-'}
                      </span>
                    </div>
                  </div>
                }
                actions={
                  (canUpdate || canDelete) ? (
                    <>
                      {canUpdate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 text-main"
                          icon={<Pencil size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRabbit(rabbit);
                            setShowEditModal(true);
                          }}
                        >
                          Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          icon={<Trash2 size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setToDelete(rabbit);
                          }}
                        >
                          Eliminar
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted font-medium py-1 px-2 text-center w-full">
                      Solo consulta
                    </span>
                  )
                }
              />
            );
          })}
        </div>
      )}

      {!loading && rabbits.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Eliminar conejo ${toDelete?.code}`}
        description="Esta acción eliminará permanentemente el conejo del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRabbit(null);
        }}
        title={`Editar Conejo: ${editingRabbit?.code}`}
        size="xl"
      >
        {editingRabbit && (
          <RabbitForm
            key={editingRabbit.id}
            mode="edit"
            defaultValues={editingRabbit}
            rabbitId={editingRabbit.id}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingRabbit(null);
              fetchRabbits();
              onSuccess?.();
            }}
            onCancel={() => {
              setShowEditModal(false);
              setEditingRabbit(null);
            }}
          />
        )}
      </Dialog>

      <RabbitDetailsModal 
        open={showDetailsModal} 
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsRabbit(null);
        }} 
        rabbit={detailsRabbit} 
        onEdit={canUpdate ? (rabbit) => {
          setEditingRabbit(rabbit);
          setShowEditModal(true);
        } : undefined}
      />
    </div>
  );
}
