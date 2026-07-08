'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader, Dialog, ConfirmDialog } from '@/shared/ui';
import { GenealogyCatalog } from '@/modules/genealogy/components/GenealogyCatalog';
import { GenealogyForm } from '@/modules/genealogy/components/GenealogyForm';
import { GenealogyTreeModal } from '@/modules/genealogy/components/GenealogyTreeModal';
import { genealogyService } from '@/modules/genealogy/services/genealogy.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import { useToast } from '@/shared/contexts/ToastContext';

import { useQueryClient } from '@tanstack/react-query';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function GenealogyPage() {
  const [modal, setModal] = useState<'register' | 'edit' | 'view' | null>(null);
  const [selectedRabbit, setSelectedRabbit] = useState<Rabbit | null>(null);
  const [editRabbitId, setEditRabbitId] = useState<number | null>(null);
  
  const [toDeleteRabbit, setToDeleteRabbit] = useState<Rabbit | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const closeModal = () => { setModal(null); setEditRabbitId(null); setSelectedRabbit(null); };

  const handleDeleteRelation = async () => {
    if (!toDeleteRabbit) return;
    setDeleting(true);
    try {
      await genealogyService.delete(toDeleteRabbit.id);
      showToast('Relación genealógica eliminada exitosamente.', 'success');
      queryClient.invalidateQueries({ queryKey: ['genealogies'] });
    } catch (err) {
      // It might throw a 404 if the rabbit doesn't have a relation to delete.
      showToast(err instanceof Error ? err.message : 'No se pudo eliminar la relación (es posible que no exista).', 'error');
    } finally {
      setDeleting(false);
      setToDeleteRabbit(null);
    }
  };

  return (
    <PermissionGuard moduleName="genealogy">
      <GalponGuard>
      <Card>
      <CardHeader
        title="Gestionar Árbol Genealógico"
        subtitle="Registra y consulta las relaciones genealógicas de los conejos"
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
        onDeleteRelation={(rabbit) => {
          setToDeleteRabbit(rabbit);
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

      <ConfirmDialog
        open={!!toDeleteRabbit}
        onClose={() => setToDeleteRabbit(null)}
        onConfirm={handleDeleteRelation}
        loading={deleting}
        title="Eliminar Relación Genealógica"
        description={`¿Estás seguro de que deseas desvincular a los padres del conejo ${toDeleteRabbit?.code}? Esto no eliminará a los conejos, solo borrará la línea genealógica.`}
        confirmLabel="Sí, eliminar"
        variant="danger"
      />
      </Card>
    </GalponGuard>
  </PermissionGuard>
  );
}
