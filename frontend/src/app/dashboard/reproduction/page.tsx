'use client';

import { Suspense, useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Plus, List } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { ReproductionForm } from '@/modules/reproduction/components/ReproductionForm';
import { ReproductionCatalog } from '@/modules/reproduction/components/ReproductionCatalog';

function ReproductionPageContent() {
  const [modal, setModal] = useState(false);

  const openModal = () => setModal(true);
  const closeModal = () => setModal(false);

  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Gestionar Crianza"
          subtitle="Registra y gestiona las montas"
          actions={
            <Button icon={<Plus size={16} />} onClick={openModal}>Registrar Monta</Button>
          }
        />

        <ReproductionCatalog />

        <Dialog
          open={modal}
          onClose={closeModal}
          title="Registrar Monta"
          size="xl"
        >
          {modal && (
            <ReproductionForm onSuccess={closeModal} onCancel={closeModal} />
          )}
        </Dialog>
      </Card>
    </GalponGuard>
  );
}

export default function ReproductionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <ReproductionPageContent />
    </Suspense>
  );
}
