'use client';

import { useRaces } from '../hooks/useRaces';
import type { Race } from '../types/race.types';
import { Button, ConfirmDialog, Dialog, LoadingMessage, CatalogCard } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { RaceForm } from './RaceForm';
import { useToast } from '@/shared/contexts/ToastContext';
import { useSupabase } from '../../../hooks/useSupabase';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface RaceCatalogProps {
  onSuccess?: () => void;
}

export function RaceCatalog({ onSuccess }: Readonly<RaceCatalogProps>) {
  const { races, pagination, loading, fetchRaces: loadRaces, deleteRace, setPage, setSearch, filters } = useRaces();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canUpdate = can('races', 'canUpdate');
  const canDelete = can('races', 'canDelete');

  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Race | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { deleteRaceImage } = useSupabase();

  const toggleRaceSelection = (raceId: number) => {
    setSelectedRaceId(prev => prev === raceId ? null : raceId);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete?.id) return;
    setDeleting(true);
    const { success, error: deleteError } = await deleteRace(toDelete.id);
    
    if (success) {
      if (toDelete.imageUrl) {
        const encodedFileName = toDelete.imageUrl.split('/').pop();
        if (encodedFileName) {
          const decodedFileName = decodeURIComponent(encodedFileName);
          await deleteRaceImage(decodedFileName).catch(console.error);
        }
      }
      setToDelete(null);
      showToast(`Raza "${toDelete.name}" eliminada correctamente.`, 'success');
      onSuccess?.();
    } else {
      showToast(deleteError || 'Error al eliminar la raza.', 'error');
    }
    setDeleting(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        searchValue={filters.search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Buscar raza por nombre..."
      />

      {loading && (
        <LoadingMessage message="Cargando razas..." />
      )}
      {!loading && races.length === 0 && (
        <p className="text-sm text-muted">No hay razas registradas.</p>
      )}
      {!loading && races.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {races.map((race) => {
            const isSelected = selectedRaceId === race.id;
            return (
              <CatalogCard
                key={race.id}
                imageUrl={race.imageUrl}
                imageAlt={race.name}
                title={race.name}
                subtitle={race.description}
                isSelected={isSelected}
                onClick={() => toggleRaceSelection(race.id)}
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
                            setEditingRace(race);
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
                            setToDelete(race);
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

      {!loading && races.length > 0 && (
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
        title={`Eliminar raza ${toDelete?.name}`}
        description="Esta acción eliminará permanentemente la raza del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRace(null);
        }}
        title={`Editar raza: ${editingRace?.name}`}
        size="xl"
      >
        {editingRace && (
          <RaceForm
            key={editingRace.id}
            mode="edit"
            defaultValues={editingRace}
            raceId={editingRace.id}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingRace(null);
              loadRaces();
              onSuccess?.();
            }}
            onCancel={() => {
              setShowEditModal(false);
              setEditingRace(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
