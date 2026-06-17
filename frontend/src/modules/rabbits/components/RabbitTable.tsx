'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Button, ConfirmDialog, Badge } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { useRabbits } from '../hooks/useRabbits';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Rabbit } from '../types/rabbit.types';

interface RabbitTableProps {
  onEdit?: (rabbit: Rabbit) => void;
}

export function RabbitTable({ onEdit }: RabbitTableProps) {
  const { rabbits, loading, error, deleteRabbit } = useRabbits();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Rabbit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!toDelete || !toDelete.id) return;
    setDeleting(true);
    const { success, error: deleteError } = await deleteRabbit(toDelete.id);
    setDeleting(false);
    setToDelete(null);
    if (success) {
      showToast(`Conejo "${toDelete.code}" eliminado correctamente.`, 'success');
    } else {
      showToast(deleteError || 'Error al eliminar el conejo.', 'error');
    }
  };

  const columns: Column<Rabbit>[] = [
    { key: 'code', header: 'Código' },
    { key: 'name', header: 'Nombre' },
    { key: 'race', header: 'Raza' },
    {
      key: 'sex',
      header: 'Sexo',
      render: (row) => (
        <Badge variant={row.sex === 'macho' ? 'primary' : 'success'}>
          {row.sex.charAt(0).toUpperCase() + row.sex.slice(1)}
        </Badge>
      ),
    },
    { key: 'age', header: 'Edad (meses)', render: (row) => row.age !== null && row.age !== undefined ? `${row.age} meses` : '-' },
    { key: 'weight', header: 'Peso (kg)', render: (row) => `${row.weight} kg` },
    {
      key: 'purpose',
      header: 'Propósito',
      render: (row) => (
        <Badge variant={row.purpose === 'Reproducción' ? 'warning' : 'neutral'}>
          {row.purpose}
        </Badge>
      ),
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
      <Table<Rabbit>
        columns={columns}
        data={rabbits}
        loading={loading}
        rowKey={(row) => row.id.toString()}
        emptyMessage="No hay conejos registrados."
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Eliminar conejo "${toDelete?.code}"`}
        description="Esta acción eliminará permanentemente el conejo del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />
    </>
  );
}
