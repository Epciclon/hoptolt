'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { RabbitCatalog } from '@/modules/rabbits/components/RabbitCatalog';
import { RabbitForm } from '@/modules/rabbits/components/RabbitForm';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function RabbitsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <PermissionGuard moduleName="rabbits">
      <GalponGuard>
        <Card>
          <CardHeader
            title="Catálogo de Conejos"
            subtitle="Visualiza, filtra y administra todos tus conejos"
            tutorialUrl="https://youtu.be/c073zLfxMyA"
            actions={
              <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>Nuevo Conejo</Button>
            }
          />
          <div className="p-4 border-t border-default">
            <RabbitCatalog />
          </div>

          <Dialog
            open={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title="Nuevo Conejo"
            size="xl"
          >
            {isCreateOpen && (
              <RabbitForm
                mode="create"
                onSuccess={() => setIsCreateOpen(false)}
                onCancel={() => setIsCreateOpen(false)}
              />
            )}
          </Dialog>
        </Card>
      </GalponGuard>
    </PermissionGuard>
  );
}
