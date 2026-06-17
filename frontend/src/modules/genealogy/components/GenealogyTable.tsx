'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Button, ConfirmDialog } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { useGenealogy } from '../hooks/useGenealogy';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Genealogy } from '../types/genealogy.types';

interface GenealogyTableProps {
  onEdit?: (genealogy: Genealogy) => void;
}

export function GenealogyTable({ onEdit }: GenealogyTableProps) {
  const { genealogies, loading, error, deleteGenealogy } = useGenealogy();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Genealogy | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!toDelete || !toDelete.rabbitId) return;
    setDeleting(true);
    const { success, error: deleteError } = await deleteGenealogy(toDelete.rabbitId);
    setDeleting(false);
    setToDelete(null);
    if (success) {
      showToast(`Relación genealógica eliminada correctamente.`, 'success');
    } else {
      showToast(deleteError || 'Error al eliminar la relación genealógica.', 'error');
    }
  };

  const columns: Column<Genealogy>[] = [
    { 
      key: 'rabbitCode', 
      header: 'Código Conejo',
      render: (row) => row.rabbit?.code || '-'
    },
    { 
      key: 'rabbitName', 
      header: 'Nombre',
      render: (row) => row.rabbit?.name || '-'
    },
    { 
      key: 'father', 
      header: 'Padre',
      render: (row) => row.father ? `${row.father.code} - ${row.father.name}` : '-'
    },
    { 
      key: 'mother', 
      header: 'Madre',
      render: (row) => row.mother ? `${row.mother.code} - ${row.mother.name}` : '-'
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
      <Table<Genealogy>
        columns={columns}
        data={genealogies}
        loading={loading}
        rowKey={(row) => row.id?.toString() || row.rabbitId.toString()}
        emptyMessage="No hay relaciones genealógicas registradas."
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Eliminar relación genealógica de "${toDelete?.rabbit?.code}"`}
        description="Esta acción eliminará permanentemente la relación genealógica del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />
    </>
  );
}
