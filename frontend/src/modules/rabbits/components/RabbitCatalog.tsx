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

interface RabbitCatalogProps {
  onSuccess?: () => void;
}

export function RabbitCatalog({ onSuccess }: Readonly<RabbitCatalogProps>) {
  const { rabbits, pagination, loading, fetchRabbits, deleteRabbit, setPage, setSearch, setRace, setSex, setPurpose, filters } = useRabbits();
  const { races } = useRaces();
  const { showToast } = useToast();
  const { deleteRabbitImage } = useSupabase();

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
  const sexOptions = [
    { label: 'Macho', value: 'macho' },
    { label: 'Hembra', value: 'hembra' }
  ];
  const purposeOptions = [
    { label: 'Reproducción', value: 'Reproducción' },
    { label: 'Engorde', value: 'Engorde' }
  ];

  const getRabbitAge = (age: number | null | undefined) => {
    if (age === null || age === undefined) return '-';
    return `${age} ${age === 1 ? 'mes' : 'meses'}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        searchValue={filters.search || ''}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Buscar por código o nombre..."
        filters={[
          { key: 'race', placeholder: 'Todas las Razas', options: raceOptions, value: filters.race || '', onChange: (val) => { setRace(val); setPage(1); } },
          { key: 'sex', placeholder: 'Cualquier Sexo', options: sexOptions, value: filters.sex || '', onChange: (val) => { setSex(val); setPage(1); } },
          { key: 'purpose', placeholder: 'Todo Propósito', options: purposeOptions, value: filters.purpose || '', onChange: (val) => { setPurpose(val); setPage(1); } }
        ]}
      />

      {loading && (
        <LoadingMessage message="Cargando conejos..." />
      )}
      {!loading && rabbits.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-lg border border-slate-200">No hay conejos registrados con esos filtros.</p>
      )}
      {!loading && rabbits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  <>
                    <div className="flex items-center gap-1"><span className="font-semibold text-slate-700">Edad:</span> {getRabbitAge(rabbit.age)}</div>
                    {rabbit.weight !== undefined && rabbit.weight !== null && (
                      <>
                        <div className="w-px h-3 bg-slate-300"></div>
                        <div className="flex items-center gap-1"><span className="font-semibold text-slate-700">Peso:</span> {rabbit.weight} kg</div>
                      </>
                    )}
                  </>
                }
                actions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      icon={<Pencil size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRabbit(rabbit);
                        setShowEditModal(true);
                      }}
                    >
                      Editar
                    </Button>
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
                  </>
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
      />
    </div>
  );
}
