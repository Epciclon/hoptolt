'use client';

import { useEffect, useState } from 'react';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { useFarmMember } from '@/modules/farmMember/hooks/useFarmMember';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { Button, Input, Dialog, ConfirmDialog, Alert, WorkerDetailsModal } from '@/shared/ui';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/shared/contexts/ToastContext';
import Link from 'next/link';
import { EditWorkerModal } from '@/modules/farmMember/components/EditWorkerModal';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido')
});

export default function UsersPage() {
  const { activeGalpon, loading: loadingGalpon } = useActiveGalpon();
  const { workers, loading: loadingWorkers, fetchWorkers, removeWorker, updateWorker } = useFarmMember();
  const { invitations, loading: loadingInv, fetchByGalpon, createInvitation, revokeInvitation, error: invitationError } = useInvitation();
  const { showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      fetchWorkers(activeGalpon.id);
      fetchByGalpon(activeGalpon.id);
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
      fetchWorkers(activeGalpon!.id);
    }
  };

  // Filter out pending and accepted invitations for display
  const pendingInvitations = invitations?.filter(i => i.status === 'pending') || [];

  return (
    <GalponGuard
      customMessage="Seleccionar un galpón activo para gestionar sus usuarios"
      customDescription="Debes seleccionar un galpón antes de poder gestionar el equipo de trabajo. Dirígete a la sección de Galpones para seleccionar uno."
    >
      <div className="space-y-6">
      {loadingGalpon ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : !isOwner ? (
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <Alert
              variant="warning"
              message="Solo los propietarios pueden gestionar usuarios"
            />
            <p className="text-slate-600 text-sm mt-4 mb-6">
              Actualmente eres trabajador en este galpón. Si deseas gestionar tu propio equipo de trabajo, debes crear tu propio galpón.
            </p>
            <Link href="/dashboard/galpones">
              <Button className="w-full">
                Ir a Galpones
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
              <p className="text-slate-500 text-sm">Gestiona los trabajadores e invitaciones de {activeGalpon?.name || 'tu galpón'}</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>+ Invitar Trabajador</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trabajadores Activos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800">Trabajadores Activos ({workers.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {loadingWorkers ? (
                  <div className="p-8 text-center text-slate-500">Cargando...</div>
                ) : workers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No hay trabajadores activos en este galpón.</div>
                ) : (
                  workers.map(worker => (
                    <div 
                      key={worker.id} 
                      className="p-4 flex justify-between items-center hover:bg-slate-100 cursor-pointer transition-colors group"
                      onClick={() => setWorkerToView(worker)}
                    >
                      <div>
                        <div className="font-medium text-slate-800">{worker.profile?.fullName}</div>
                        <div className="text-xs text-slate-500">{worker.profile?.email} • @{worker.profile?.username}</div>
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                        Ver detalles →
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Invitaciones Pendientes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800">Invitaciones Pendientes ({pendingInvitations.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {loadingInv ? (
                  <div className="p-8 text-center text-slate-500">Cargando...</div>
                ) : pendingInvitations.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No hay invitaciones pendientes.</div>
                ) : (
                  pendingInvitations.map(inv => (
                    <div key={inv.token} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-medium text-slate-800">{inv.email}</div>
                        <div className="text-xs text-slate-500">Invitado por: {inv.inviter?.fullName || 'Usuario'} • Enviada: {new Date(inv.createdAt).toLocaleDateString()}</div>
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
                  ))
                )}
              </div>
            </div>
          </div>

          <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invitar Nuevo Trabajador">
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
      )}
      </div>

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
        fetchWorkerById={farmMemberService.getWorkerById}
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
