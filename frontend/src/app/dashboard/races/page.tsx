'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { RaceCatalog } from '@/modules/races/components/RaceCatalog';
import { RaceForm } from '@/modules/races/components/RaceForm';

export default function RacesPage() {
  const [modal, setModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = () => setModal(true);
  const closeModal = () => setModal(false);
  const handleSuccess = () => { closeModal(); setRefreshKey((k) => k + 1); };

  return (
    <GalponGuard requireGalpon={false}>
      <Card>
      <CardHeader
        title="Gestión de Razas"
        subtitle="Registra y administra las razas de conejos"
        actions={
          <Button icon={<Plus size={16} />} onClick={openModal}>Nueva Raza</Button>
        }
      />
      <RaceCatalog key={refreshKey} onSuccess={handleSuccess} />

      <Dialog
        open={modal}
        onClose={closeModal}
        title="Nueva Raza"
        size="md"
      >
        {modal && (
          <RaceForm
            mode="create"
            onSuccess={handleSuccess}
            onCancel={closeModal}
          />
        )}
      </Dialog>
      </Card>
    </GalponGuard>
  );
}
