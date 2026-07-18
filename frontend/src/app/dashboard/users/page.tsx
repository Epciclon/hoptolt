'use client';

import { useEffect, useState } from 'react';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { useFarmMember } from '@/modules/farmMember/hooks/useFarmMember';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { Button, Input, Dialog, ConfirmDialog, Alert, WorkerDetailsModal, DashboardTabs, Card, CardHeader, SectionMessage } from '@/shared/ui';
import { Users, Mail } from 'lucide-react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/shared/contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { EditWorkerModal } from '@/modules/farmMember/components/EditWorkerModal';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido')
});

export default function UsersPage() {
  const { activeGalpon, loading: loadingGalpon } = useActiveGalpon();
  const { workers, loading: loadingWorkers, fetchWorkers, removeWorker, updateWorker } = useFarmMember();
  const { invitations, loading: loadingInv, createInvitation, revokeInvitation, error: invitationError } = useInvitation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workers');
  const [submitting, setSubmitting] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<any>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<any>(null);
  const [workerToView, setWorkerToView] = useState<any>(null);
  
  const isOwner = activeGalpon?.memberRole === 'owner';

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  });

  useEffect(() => {
    if (activeGalpon && isOwner) {
      // React Query handles fetching automatically via useQuery when activeGalpon changes.
      // We don't need to manually pass the ID to a refetch function anymore.
      // If we wanted to force refetch, we would call fetchWorkers() without arguments.
    }
  }, [activeGalpon?.id, isOwner]);

  const onInvite = async (data: { email: string }) => {
    setSubmitting(true);
    const success = await createInvitation(activeGalpon!.id, data.email);
    setSubmitting(false);
    if (success) {
      setIsModalOpen(false);
      reset();
      showToast('Invitación enviada exitosamente.', 'success');
    } else {
      showToast(invitationError || 'Error al enviar la invitación.', 'error');
    }
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    setDeleting(true);
    const success = await removeWorker(workerToDelete.id);
    setDeleting(false);
    setWorkerToDelete(null);
    if (success) {
      showToast(`${workerToDelete.profile?.fullName} eliminado del galpón correctamente.`, 'success');
    }
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;
    setDeleting(true);
    await revokeInvitation(invitationToDelete.token);
    setDeleting(false);
    setInvitationToDelete(null);
    showToast('Invitación eliminada correctamente.', 'success');
  };

  const handleSaveWorker = async (data: any) => {
    const success = await updateWorker(workerToEdit.id, data);
    if (success) {
      showToast('Trabajador actualizado exitosamente', 'success');
      fetchWorkers();
      queryClient.invalidateQueries({ queryKey: ['worker', workerToEdit.id] });
    }
  };

  const pendingInvitations = invitations?.filter(i => i.status === 'pending') || [];

  const tabs = [
    { id: 'workers', label: `Trabajadores Activos (${workers.length})`, icon: <Users size={18} /> },
    { id: 'invitations', label: `Invitaciones Pendientes (${pendingInvitations.length})`, icon: <Mail size={18} /> }
  ];

  const renderWorkersTab = () => {
    let content;
    if (loadingWorkers) {
      content = <div className="p-8 text-center text-muted">Cargando...</div>;
    } else if (workers.length === 0) {
      content = <div className="p-8 text-center text-muted">No hay trabajadores activos en este galpón.</div>;
    } else {
      content = workers.map(worker => (
        <button 
          key={worker.id} 
          type="button"
          className="w-full text-left bg-transparent border-none outline-none p-4 flex justify-between items-center hover:bg-theme-surface border border-default cursor-pointer transition-colors group block"
          onClick={() => setWorkerToView(worker)}
        >
          <div>
            <div className="font-medium text-main">{worker.profile?.fullName}</div>
            <div className="text-xs text-muted">{worker.profile?.email}  @{worker.profile?.username}</div>
          </div>
          <span className="text-xs text-theme-faint group-hover:text-muted transition-colors">
            Ver detalles ?
          </span>
        </button>
      ));
    }

    return (
      <>
        <SectionMessage message="En esta fase se puede revisar el equipo de trabajo actual." />
        <div className="bg-card rounded-xl shadow-sm border border-strong overflow-hidden">
          <div className="divide-y divide-slate-100">
            {content}
          </div>
        </div>
      </>
    );
  };

  const renderInvitationsTab = () => {
    let content;
    if (loadingInv) {
      content = <div className="p-8 text-center text-muted">Cargando...</div>;
    } else if (pendingInvitations.length === 0) {
      content = <div className="p-8 text-center text-muted">No hay invitaciones pendientes.</div>;
    } else {
      content = pendingInvitations.map(inv => (
        <div key={inv.token} className="p-4 flex justify-between items-center hover:bg-theme-surface transition-colors">
          <div>
            <div className="font-medium text-main">{inv.email}</div>
            <div className="text-xs text-muted">Invitado por: {inv.inviter?.fullName || 'Usuario'}  Enviada: {new Date(inv.createdAt).toLocaleDateString()}</div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setInvitationToDelete(inv)}
          >
            Eliminar
          </Button>
        </div>
      ));
    }

    return (
      <>
        <SectionMessage message="En esta fase se puede revisar las invitaciones pendientes." />
        <div className="bg-card rounded-xl shadow-sm border border-strong overflow-hidden">
          <div className="divide-y divide-slate-100">
            {content}
          </div>
        </div>
      </>
    );
  };

  const renderMainContent = () => {
    if (loadingGalpon) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      );
    }

    if (!isOwner) {
      return (
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <Alert
              variant="warning"
              message="Solo los propietarios pueden gestionar usuarios"
            />
            <p className="text-muted text-sm mt-4 mb-6">
              Actualmente eres trabajador en este galpón. Si deseas gestionar tu propio equipo de trabajo, debes crear tu propio galpón.
            </p>
            <Link href="/dashboard/galpones">
              <Button className="w-full">
                Ir a Galpones
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <>
        <CardHeader 
          title="Tu Equipo" 
          subtitle={`Invita a tus trabajadores y decide qué cosas pueden ver o hacer en ${activeGalpon?.name || 'la granja'}`}
          actions={<Button onClick={() => setIsModalOpen(true)}>+ Invitar Trabajador</Button>}
        />

        <DashboardTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="p-6 pt-0">
          {activeTab === 'workers' && renderWorkersTab()}
          {activeTab === 'invitations' && renderInvitationsTab()}
        </div>

        <Dialog 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Invitar Nuevo Trabajador"
          description="Ingresa el correo electrónico del usuario que deseas invitar a colaborar en este galpón. Se le enviará una notificación para unirse."
        >
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4 pt-4">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="correo@ejemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />
            
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </form>
        </Dialog>
      </>
    );
  };

  return (
    <GalponGuard
      customMessage="Seleccionar un galpón activo para gestionar sus usuarios"
      customDescription="Debes seleccionar un galpón antes de poder gestionar el equipo de trabajo. Dirígete a la sección de Galpones para seleccionar uno."
    >
      <Card className="min-h-[calc(100vh-7rem)]">
        {renderMainContent()}
      </Card>

      <ConfirmDialog
        open={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={handleDeleteWorker}
        loading={deleting}
        title={`¿Eliminar a ${workerToDelete?.profile?.fullName}?`}
        description={`Se eliminará a ${workerToDelete?.profile?.fullName} del galpón. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />

      <ConfirmDialog
        open={!!invitationToDelete}
        onClose={() => setInvitationToDelete(null)}
        onConfirm={handleDeleteInvitation}
        loading={deleting}
        title="¿Eliminar invitación?"
        description={`Se eliminará la invitación para ${invitationToDelete?.email}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />

      <EditWorkerModal
        open={!!workerToEdit}
        onClose={() => setWorkerToEdit(null)}
        worker={workerToEdit}
        onSave={handleSaveWorker}
      />

      <WorkerDetailsModal
        open={!!workerToView}
        onClose={() => setWorkerToView(null)}
        worker={workerToView}
        fetchWorkerById={farmMemberService.getWorkerById as any}
        onEdit={(worker) => {
          setWorkerToView(null);
          setWorkerToEdit(worker as any);
        }}
        onDelete={(worker) => {
          setWorkerToView(null);
          setWorkerToDelete(worker);
        }}
      />
    </GalponGuard>
  );
}
