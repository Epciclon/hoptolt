'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Plus } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { GenealogyTable } from '@/modules/genealogy/components/GenealogyTable';
import { GenealogyForm } from '@/modules/genealogy/components/GenealogyForm';
import { GenealogyTreeView } from '@/modules/genealogy/components/GenealogyTreeView';
import type { Genealogy } from '@/modules/genealogy/types/genealogy.types';

export default function GenealogyPage() {
  const [modal, setModal] = useState<'register' | 'edit' | 'view' | null>(null);
  const [editData, setEditData] = useState<Genealogy | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openRegister = () => setModal('register');
  const openEdit = (genealogy: Genealogy) => { setEditData(genealogy); setModal('edit'); };
  const openView = () => setModal('view');
  const closeModal = () => { setModal(null); setEditData(null); };
  const handleSuccess = () => { closeModal(); setRefreshKey((k) => k + 1); };

  return (
    <GalponGuard>
      <Card>
      <CardHeader
        title="Gestionar Árbol Genealógico"
        subtitle="Registra y consulta las relaciones genealógicas de los conejos"
        actions={
          <div className="flex gap-2">
            <Button icon={<Plus size={16} />} onClick={openRegister}>Registrar Relación</Button>
            <Button variant="outline" onClick={openView}>Consultar Árbol</Button>
          </div>
        }
      />
      <GenealogyTable key={refreshKey} onEdit={openEdit} />

      <Dialog
        open={modal === 'register'}
        onClose={closeModal}
        title="Registrar Relación Genealógica"
        size="xl"
      >
        {modal === 'register' && (
          <GenealogyForm onSuccess={handleSuccess} onCancel={closeModal} />
        )}
      </Dialog>

      <Dialog
        open={modal === 'edit'}
        onClose={closeModal}
        title="Editar Relación Genealógica"
        size="xl"
      >
        {modal === 'edit' && (
          <GenealogyForm editData={editData || undefined} onSuccess={handleSuccess} onCancel={closeModal} />
        )}
      </Dialog>

      <Dialog
        open={modal === 'view'}
        onClose={closeModal}
        title="Consultar Árbol Genealógico"
        size="xl"
      >
        {modal === 'view' && (
          <GenealogyTreeView onCancel={closeModal} />
        )}
      </Dialog>
      </Card>
    </GalponGuard>
  );
}
