'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { GalponTable } from '@/modules/galpones/components/GalponTable';
import { GalponForm } from '@/modules/galpones/components/GalponForm';
import type { Galpon } from '@/modules/galpones/types/galpon.types';
export default function GalponesPage() {
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Galpon | null>(null);


  const openCreate = () => { setEditTarget(null); setModal('create'); };
  const openEdit = (galpon: Galpon) => { setEditTarget(galpon); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditTarget(null); };



  return (
      <Card>
        <CardHeader
          title="Gestionar Galpones"
          subtitle="Administra los galpones del criadero y selecciona tu galpón activo"
          actions={
            <Button icon={<Plus size={16} />} onClick={openCreate}>Nuevo Galpón</Button>
          }
        />
        <GalponTable onEdit={openEdit} />

        <Dialog
          open={modal !== null}
          onClose={closeModal}
          title={modal === 'create' ? 'Nuevo Galpón' : `Editar Galpón: ${editTarget?.name}`}
          size="xl"
        >
          {modal !== null && (
            <GalponForm
              mode={modal}
              defaultValues={editTarget ?? undefined}
              galponId={editTarget?.id}
              onSuccess={closeModal}
              onCancel={closeModal}
            />
          )}
        </Dialog>
      </Card>
  );
}
