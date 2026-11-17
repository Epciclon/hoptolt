'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, Button, ConfirmDialog, FullScreenLoader, FilterBar, type Column } from '@/shared/ui';
import { useGalpones } from '../hooks/useGalpones';
import { useActiveGalpon } from '../hooks/useActiveGalpon';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Galpon } from '../types/galpon.types';
import { getGalponBaseColumns } from '../utils/galponUtils';

interface GalponTableProps {
  onEdit?: (galpon: Galpon) => void;
}

export function GalponTable({ onEdit }: Readonly<GalponTableProps>) {
  const { galpones, loading, deleteGalpon } = useGalpones();
  const { activeGalpon, setActive } = useActiveGalpon();
  const { user, refetchUser } = useAuthContext();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Galpon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGalpones = galpones.filter(g => 
    !searchTerm || 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    const wasActiveOnClient = activeGalpon?.id === target.id;
    setDeleting(true);
    try {
      const result = await deleteGalpon(target.id);
      setToDelete(null);

      const switchedTo = result?.nextActiveGalpon ?? null;
      const wasActive = Boolean(result?.wasActiveGalpon || wasActiveOnClient);

      if (wasActive) {
        await refetchUser(true);
        if (switchedTo) {
          sessionStorage.setItem(
            'flash_toast',
            `Galpón "${target.name}" eliminado. Como era tu galpón activo, se cambió automáticamente a "${switchedTo.name}".`
          );
        } else {
          sessionStorage.setItem(
            'flash_toast',
            `Galpón "${target.name}" eliminado. Como era tu único galpón activo, ya no tienes ningún galpón seleccionado.`
          );
        }
        window.location.reload();
        return;
      }

      showToast(`Galpón "${target.name}" eliminado correctamente.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar el galpón.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectGalpon = async (galpon: Galpon) => {
    setSelecting(true);
    await setActive(galpon.id);
    setSelecting(false);
  };

  const columns: Column<Galpon>[] = [
    ...getGalponBaseColumns(),
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
        <FullScreenLoader message="Cambiando galpón..." />
      )}

      <div className="mb-4">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre o ubicación..."
        />
      </div>

      <Table<Galpon>
        columns={columns}
        data={filteredGalpones}
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
