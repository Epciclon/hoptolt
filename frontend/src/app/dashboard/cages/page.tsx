'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { CageTable } from '@/modules/cages/components/CageTable';
import { CageForm } from '@/modules/cages/components/CageForm';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';
import type { Cage } from '@/modules/cages/types/cage.types';

export default function CagesPage() {
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Cage | null>(null);

  const openCreate = () => { setEditTarget(null); setModal('create'); };
  const openEdit = (cage: Cage) => { setEditTarget(cage); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditTarget(null); };

  return (
    <PermissionGuard moduleName="cages">
      <GalponGuard>
        <Card>
          <CardHeader
            title="Gestión de Jaulas"
            subtitle="Administra las jaulas del criadero"
            actions={
              <Button icon={<Plus size={16} />} onClick={openCreate}>Nueva Jaula</Button>
            }
          />
          <CageTable onEdit={openEdit} />

          <Dialog
            open={modal !== null}
            onClose={closeModal}
            title={modal === 'create' ? 'Nueva Jaula' : `Editar Jaula #${editTarget?.number}`}
            size="md"
          >
            {modal !== null && (
              <CageForm
                mode={modal}
                defaultValues={editTarget ?? undefined}
                cageId={editTarget?.id}
                onSuccess={closeModal}
                onCancel={closeModal}
              />
            )}
          </Dialog>
        </Card>
      </GalponGuard>
    </PermissionGuard>
  );
}
