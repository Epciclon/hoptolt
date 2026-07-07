'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Badge, Button, ConfirmDialog, LoadingMessage } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import type { Column } from '@/shared/ui/Table';
import { useCages } from '../hooks/useCages';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Cage } from '../types/cage.types';

interface CageTableProps {
  onEdit?: (cage: Cage) => void;
}

export function CageTable({ onEdit }: CageTableProps) {
  const { cages, pagination, loading, error, deleteCage, setPage, setSearch, setType, setStatus, filters } = useCages();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Cage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { success, error: deleteError } = await deleteCage(deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
    if (success) {
      showToast(`Jaula #${deleteTarget.number} eliminada correctamente.`, 'success');
    } else {
      showToast(deleteError || 'No se pudo eliminar la jaula.', 'error');
    }
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
      key: 'status',
      header: 'Estado',
      render: (row) => {
        if (row.status === 'mantenimiento') {
          return <Badge variant="warning">Mantenimiento</Badge>;
        }

        let label = 'Operativa';
        let variant: 'success' | 'info' | 'danger' | 'warning' | 'primary' | 'neutral' = 'success';

        if (row.occupancyStatus === 'disponible') {
          label = 'Operativa (Libre)';
          variant = 'success';
        } else if (row.occupancyStatus === 'parcial') {
          label = `Operativa (Parcial ${row.assignedCount}/${row.capacity})`;
          variant = 'info';
        } else if (row.occupancyStatus === 'llena') {
          label = row.type === 'reproducción'
            ? 'Operativa (Llena)'
            : `Operativa (Llena ${row.assignedCount}/${row.capacity})`;
          variant = 'danger';
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
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

  if (loading) return <LoadingMessage message="Cargando jaulas..." />;

  return (
    <div className="flex flex-col gap-2">
      <FilterBar
        searchValue={filters.search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Buscar por N° de Jaula..."
        filters={[
          {
            key: 'type',
            placeholder: 'Filtrar por tipo',
            options: [
              { label: 'Engorde', value: 'engorde' },
              { label: 'Reproducción', value: 'reproducción' }
            ],
            value: filters.type,
            onChange: (val) => { setType(val); setPage(1); }
          },
          {
            key: 'status',
            placeholder: 'Filtrar por estado',
            options: [
              { label: 'Operativa', value: 'operativa' },
              { label: 'Mantenimiento', value: 'mantenimiento' }
            ],
            value: filters.status,
            onChange: (val) => { setStatus(val); setPage(1); }
          }
        ]}
      />

      <Table
        columns={columns}
        data={cages}
        emptyMessage="No hay jaulas registradas."
        rowKey={(row) => row.id}
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
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
    </div>
  );
}
