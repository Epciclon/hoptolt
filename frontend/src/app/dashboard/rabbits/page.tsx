'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { RabbitTable } from '@/modules/rabbits/components/RabbitTable';
import { RabbitForm } from '@/modules/rabbits/components/RabbitForm';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

export default function RabbitsPage() {
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Rabbit | null>(null);

  const openCreate = () => { setEditTarget(null); setModal('create'); };
  const openEdit = (rabbit: Rabbit) => { setEditTarget(rabbit); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditTarget(null); };

  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Gestión de Conejos"
          subtitle="Registra y administra los conejos del criadero"
          actions={
            <Button icon={<Plus size={16} />} onClick={openCreate}>Nuevo Conejo</Button>
          }
        />
        <RabbitTable onEdit={openEdit} />

        <Dialog
          open={modal !== null}
          onClose={closeModal}
          title={modal === 'create' ? 'Nuevo Conejo' : `Editar Conejo: ${editTarget?.code}`}
          size="xl"
        >
          {modal !== null && (
            <RabbitForm
              mode={modal}
              defaultValues={editTarget ?? undefined}
              rabbitId={editTarget?.id}
              onSuccess={closeModal}
              onCancel={closeModal}
            />
          )}
        </Dialog>
      </Card>
    </GalponGuard>
  );
}
