'use client';

import { useRaces } from '../hooks/useRaces';
import type { Race } from '../types/race.types';
import { Button, Alert, ConfirmDialog, Dialog } from '@/shared/ui';
import { ImagePlaceholder } from '@/shared/ui/ImagePlaceholder';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { RaceForm } from './RaceForm';
import Image from 'next/image';

interface RaceCatalogProps {
  onSuccess?: () => void;
}

export function RaceCatalog({ onSuccess }: RaceCatalogProps) {
  const { races, loading, error, loadRaces, deleteRace } = useRaces();
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Race | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const toggleRaceSelection = (raceId: number) => {
    setSelectedRaceId(prev => prev === raceId ? null : raceId);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete || !toDelete.id) return;
    setDeleting(true);
    try {
      await deleteRace(toDelete.id);
      setToDelete(null);
      onSuccess?.();
    } catch (err) {
      // Error ya manejado en el hook
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-slate-500 py-8">Cargando razas...</p>;
  }

  return (
    <>
      {error && (
        <Alert variant="error" message={error} onClose={() => {}} className="mb-4" />
      )}

      {races.length === 0 ? (
        <p className="text-sm text-slate-500">No hay razas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {races.map((race) => {
            const isSelected = selectedRaceId === race.id;
            return (
              <div
                key={race.id}
                onClick={() => toggleRaceSelection(race.id)}
                className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${
                  isSelected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-primary-300'
                }`}
              >
                <div className={`p-3 border-b ${
                  isSelected ? 'border-primary-300 bg-primary-100' : 'border-slate-200 bg-slate-50'
                }`}>
                  <h4 className="font-semibold text-slate-800">{race.name}</h4>
                </div>
                <div className="p-3 space-y-2">
                  {race.imageUrl ? (
                    <div className="relative w-full h-48 mb-2">
                      <Image
                        src={race.imageUrl}
                        alt={race.name}
                        fill
                        className="object-contain rounded-lg"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="mb-2 flex justify-center">
                      <ImagePlaceholder size="md" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-600">{race.description}</p>
                  </div>
                  {isSelected && (
                    <div className="flex gap-2 pt-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRace(race);
                          setShowEditModal(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete(race);
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </>
  );
}
