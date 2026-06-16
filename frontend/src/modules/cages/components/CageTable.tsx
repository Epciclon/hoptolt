'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Badge, Button, ConfirmDialog, Alert } from '@/shared/ui';
import type { Column } from '@/shared/ui';
import { useCages } from '../hooks/useCages';
import type { Cage } from '../types/cage.types';

interface CageTableProps {
  onEdit?: (cage: Cage) => void;
}

export function CageTable({ onEdit }: CageTableProps) {
  const { cages, loading, error, deleteCage } = useCages();
  const [deleteTarget, setDeleteTarget] = useState<Cage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const ok = await deleteCage(deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
    if (ok) setSuccessMsg(`Jaula #${deleteTarget.number} eliminada correctamente.`);
  };

  const columns: Column<Cage>[] = [
    { key: 'number', header: 'N° Jaula', className: 'font-semibold' },
    {
      key: 'type',
      header: 'Tipo',
      render: (row) => (
        <Badge variant={row.type === 'reproducción' ? 'primary' : 'success'}>
          {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
        </Badge>
      ),
    },
    { key: 'capacity', header: 'Capacidad', render: (row) => `${row.capacity} ${row.capacity === 1 ? 'conejo' : 'conejos'}` },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Pencil size={13} />}
            onClick={() => onEdit?.(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 size={13} />}
            onClick={() => setDeleteTarget(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {successMsg && (
        <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} className="mb-4" />
      )}
      {error && <Alert variant="error" message={error} className="mb-4" />}

      <Table
        columns={columns}
        data={cages}
        loading={loading}
        emptyMessage="No hay jaulas registradas."
        rowKey={(row) => row.id}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="¿Eliminar jaula?"
        description={`Se eliminará permanentemente la Jaula #${deleteTarget?.number}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </>
  );
}
