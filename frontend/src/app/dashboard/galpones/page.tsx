'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog, Alert } from '@/shared/ui';
import { GalponTable } from '@/modules/galpones/components/GalponTable';
import { GalponForm } from '@/modules/galpones/components/GalponForm';
import type { Galpon } from '@/modules/galpones/types/galpon.types';

export default function GalponesPage() {
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Galpon | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  const openCreate = () => { setEditTarget(null); setModal('create'); };
  const openEdit = (galpon: Galpon) => { setEditTarget(galpon); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditTarget(null); };
  const handleSuccess = () => { closeModal(); setRefreshKey((k) => k + 1); };
  
  const handleSelectActive = (galpon: Galpon) => {
    setNotification(`Usando galpón: ${galpon.name}`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Gestionar Galpones"
          subtitle="Registra y administra los galpones del criadero"
          actions={
            <Button icon={<Plus size={16} />} onClick={openCreate}>Nuevo Galpón</Button>
          }
        />
        <GalponTable key={refreshKey} onEdit={openEdit} onSelectActive={handleSelectActive} />

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
              onSuccess={handleSuccess}
              onCancel={closeModal}
            />
          )}
        </Dialog>
      </Card>

      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert variant="success" message={notification} />
        </div>
      )}
    </>
  );
}
