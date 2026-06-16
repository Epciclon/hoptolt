'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { AssignmentTable } from '@/modules/assignments/components/AssignmentTable';
import { AssignRabbitForm } from '@/modules/assignments/components/AssignRabbitForm';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';

export default function AssignmentsPage() {
  const [modal, setModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = () => setModal(true);
  const closeModal = () => setModal(false);
  const handleSuccess = () => { closeModal(); setRefreshKey((k) => k + 1); };

  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Asignaciones de Conejos"
          subtitle="Gestiona qué conejo está en cada jaula"
          actions={
            <Button icon={<Plus size={16} />} onClick={openModal}>Asignar Conejo</Button>
          }
        />
        <AssignmentTable key={refreshKey} />

        <Dialog
          open={modal}
          onClose={closeModal}
          title="Asignar Conejo a Jaula"
          size="xl"
        >
          {modal && (
            <AssignRabbitForm
              onSuccess={handleSuccess}
              onCancel={closeModal}
            />
          )}
        </Dialog>
      </Card>
    </GalponGuard>
  );
}
