'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader, Dialog } from '@/shared/ui';
import { GenealogyCatalog } from '@/modules/genealogy/components/GenealogyCatalog';
import { GenealogyForm } from '@/modules/genealogy/components/GenealogyForm';
import { GenealogyTreeModal } from '@/modules/genealogy/components/GenealogyTreeModal';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function GenealogyPage() {
  const [modal, setModal] = useState<'register' | 'edit' | 'view' | null>(null);
  const [selectedRabbit, setSelectedRabbit] = useState<Rabbit | null>(null);
  const [editRabbitId, setEditRabbitId] = useState<number | null>(null);
  
  const closeModal = () => { setModal(null); setEditRabbitId(null); setSelectedRabbit(null); };

  return (
    <PermissionGuard moduleName="genealogy">
      <GalponGuard>
      <Card>
      <CardHeader
        title="Familia y Descendencia"
        subtitle="Descubre quién es el padre, la madre y los hijos de cada conejo"
      />
      <GenealogyCatalog 
        onViewTree={(rabbit) => {
          setSelectedRabbit(rabbit);
          setModal('view');
        }} 
        onEditRelation={(rabbit) => {
          setEditRabbitId(rabbit.id);
          setModal('edit');
        }} 
      />

      <Dialog
        open={modal === 'register' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'register' ? "Registrar Relación Genealógica" : "Editar Relación Genealógica"}
        size="xl"
      >
        {(modal === 'register' || modal === 'edit') && (
          <GenealogyForm 
            rabbitId={editRabbitId || undefined} 
            onSuccess={closeModal} 
            onCancel={closeModal} 
          />
        )}
      </Dialog>

      {modal === 'view' && selectedRabbit && (
        <GenealogyTreeModal 
          rabbit={selectedRabbit} 
          onClose={closeModal} 
        />
      )}

      </Card>
    </GalponGuard>
  </PermissionGuard>
  );
}
