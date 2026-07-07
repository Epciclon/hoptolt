'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Button, ConfirmDialog } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { useGalpones } from '../hooks/useGalpones';
import { useActiveGalpon } from '../hooks/useActiveGalpon';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Galpon } from '../types/galpon.types';
import { galponService } from '../services/galpon.service';

interface GalponTableProps {
  onEdit?: (galpon: Galpon) => void;
}

export function GalponTable({ onEdit }: GalponTableProps) {
  const { galpones, loading, error, refetch } = useGalpones();
  const { activeGalpon, setActive } = useActiveGalpon();
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Galpon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await galponService.delete(toDelete.id);
      setToDelete(null);
      showToast(`Galpón "${toDelete.name}" eliminado correctamente.`, 'success');
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar el galpón.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectGalpon = async (galpon: Galpon) => {
    setSelecting(true);
    const success = await setActive(galpon.id);
    if (success) {
      showToast(`Galpón "${galpon.name}" seleccionado como activo.`, 'success');
    }
    setSelecting(false);
  };

  const columns: Column<Galpon>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'province', header: 'Provincia' },
    { key: 'location', header: 'Ubicación' },
    { key: 'totalCapacity', header: 'Capacidad Total' },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => {
        const isOwner = user?.id === row.profileId;
        
        if (!isOwner) {
          return null;
        }

        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              icon={<Pencil size={14} />} 
              onClick={(e) => { e.stopPropagation(); onEdit?.(row); }}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={(e) => { e.stopPropagation(); setToDelete(row); }}
            >
              Eliminar
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {selecting && (
        <div className="fixed inset-0 z-50 bg-white/40 cursor-wait"></div>
      )}
      <Table<Galpon>
        columns={columns}
        data={galpones}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage="No hay galpones registrados."
        onRowClick={handleSelectGalpon}
        isRowActive={(row) => activeGalpon?.id === row.id}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Eliminar galpón "${toDelete?.name}"`}
        description="Esta acción eliminará permanentemente el galpón del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />
    </>
  );
}
