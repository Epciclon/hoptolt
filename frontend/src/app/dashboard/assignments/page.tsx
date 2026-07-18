'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { AssignmentTable } from '@/modules/assignments/components/AssignmentTable';
import { AssignRabbitForm } from '@/modules/assignments/components/AssignRabbitForm';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function AssignmentsPage() {
  const [modal, setModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = () => setModal(true);
  const closeModal = () => setModal(false);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
    closeModal();
  };

  return (
    <PermissionGuard moduleName="assignments">
      <GalponGuard>
        <Card>
          <CardHeader
            title="Mover Conejos"
            subtitle="Elige en qué jaula debe vivir cada conejo y mantén el orden"
            actions={
              <Button icon={<Plus size={16} />} onClick={openModal}>Asignar Conejo</Button>
            }
          />
          
          <div className="p-6">
            <AssignmentTable key={refreshKey} />
          </div>

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
    </PermissionGuard>
  );
}
