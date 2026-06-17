'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Button, ConfirmDialog } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { useRaces } from '../hooks/useRaces';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Race } from '../types/race.types';

interface RaceTableProps {
  onEdit?: (race: Race) => void;
}

export function RaceTable({ onEdit }: RaceTableProps) {
  const { races, loading, error, deleteRace } = useRaces();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Race | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!toDelete || !toDelete.id) return;
    setDeleting(true);
    const { success, error: deleteError } = await deleteRace(toDelete.id);
    setDeleting(false);
    setToDelete(null);
    if (success) {
      showToast(`Raza "${toDelete.name}" eliminada correctamente.`, 'success');
    } else {
      showToast(deleteError || 'Error al eliminar la raza.', 'error');
    }
  };

  const columns: Column<Race>[] = [
    {
      key: 'name',
      header: 'Nombre',
    },
    {
      key: 'description',
      header: 'Descripción',
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" icon={<Pencil size={14} />} onClick={() => onEdit?.(row)}>
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => setToDelete(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table<Race>
        columns={columns}
        data={races}
        loading={loading}
        rowKey={(row) => row.id?.toString() || row.name}
        emptyMessage="No hay razas registradas."
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Eliminar raza "${toDelete?.name}"`}
        description="Esta acción no se puede deshacer. Se eliminarán todos los datos asociados."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />
    </>
  );
}
