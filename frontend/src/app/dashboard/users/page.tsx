'use client';

import { Suspense, useEffect, useState } from 'react';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { useFarmMember } from '@/modules/farmMember/hooks/useFarmMember';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { Button, Input, Dialog, ConfirmDialog, Alert, WorkerDetailsModal, DashboardTabs, Card, CardHeader, SectionMessage, FilterBar } from '@/shared/ui';
import { Users, Mail, History, Sparkles } from 'lucide-react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/shared/contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { EditWorkerModal } from '@/modules/farmMember/components/EditWorkerModal';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { AuditChangeLogTab } from '@/modules/farmMember/components/AuditChangeLogTab';
import { SystemAuditLogTab } from '@/modules/farmMember/components/SystemAuditLogTab';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido')
});

function UsersPageContent() {
  const { activeGalpon, loading: loadingGalpon } = useActiveGalpon();
  const { workers, loading: loadingWorkers, fetchWorkers, removeWorker, updateWorker } = useFarmMember();
  const { invitations, loading: loadingInv, createInvitation, revokeInvitation, error: invitationError } = useInvitation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { activeTab, handleTabChange: setActiveTab } = usePersistentTab('users', 'workers');
  const [submitting, setSubmitting] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<any>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<any>(null);
  const [workerToView, setWorkerToView] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isOwner = activeGalpon?.memberRole === 'owner';

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  });

  useEffect(() => {
    if (activeGalpon && isOwner) {
      // React Query handles fetching automatically via useQuery when activeGalpon changes.
    }
  }, [activeGalpon, isOwner]);

  const onInvite = async (data: { email: string }) => {
    setSubmitting(true);
    try {
      const success = await createInvitation(activeGalpon!.id, data.email);
      if (success) {
        setIsModalOpen(false);
        reset();
        showToast('Invitación enviada exitosamente.', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || invitationError || 'Error al enviar la invitación.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    setDeleting(true);
    try {
      const success = await removeWorker(workerToDelete.id);
      if (success) {
        showToast(`${workerToDelete.profile?.fullName} eliminado del galpón correctamente.`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar trabajador.', 'error');
    } finally {
      setDeleting(false);
      setWorkerToDelete(null);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;
    setDeleting(true);
    try {
      await revokeInvitation(invitationToDelete.token);
      showToast('Invitación eliminada correctamente.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar invitación.', 'error');
    } finally {
      setDeleting(false);
      setInvitationToDelete(null);
    }
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
    { id: 'workers', label: `Trabajadores Activos • ${workers.length}`, icon: <Users size={18} /> },
    { id: 'invitations', label: `Invitaciones Pendientes • ${pendingInvitations.length}`, icon: <Mail size={18} /> },
    { id: 'audit-logs', label: 'Control de Cambios', icon: <History size={18} /> },
    { id: 'system-logs', label: 'Movimientos de HopTolt', icon: <Sparkles size={18} /> }
  ];

  const renderWorkersTab = () => {
    let content;
    if (loadingWorkers) {
      content = <div className="p-8 text-center text-muted">Cargando...</div>;
    } else if (workers.length === 0) {
      content = <div className="p-8 text-center text-muted">No hay trabajadores activos en este galpón.</div>;
    } else {
      const filteredWorkers = workers.filter(w => 
        !searchTerm || 
        w.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredWorkers.length === 0) {
        content = <div className="p-8 text-center text-muted">No se encontraron trabajadores que coincidan con la búsqueda.</div>;
      } else {
        content = filteredWorkers.map(worker => (
          <button 
          key={worker.id} 
          type="button"
          className="w-full text-left bg-transparent border-none outline-none p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-b border-default cursor-pointer transition-colors group block"
          onClick={() => setWorkerToView(worker)}
        >
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-main text-sm sm:text-base leading-snug">{worker.profile?.fullName}</div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted mt-0.5 break-all">
              <span>{worker.profile?.email}</span>
              {worker.profile?.username && (
                <>
                  <span className="text-theme-faint">•</span>
                  <span>@{worker.profile?.username}</span>
                </>
              )}
            </div>
          </div>
          <span className="text-xs font-medium text-primary-600 dark:text-primary-400 sm:text-theme-faint sm:group-hover:text-primary-600 dark:sm:group-hover:text-primary-400 shrink-0 self-end sm:self-auto transition-colors whitespace-nowrap">
            Ver detalles →
          </span>
        </button>
      ));
      }
    }

    return (
      <>
        <SectionMessage message="En esta fase se puede revisar el equipo de trabajo actual." />
        <div className="mb-4">
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por nombre, correo o usuario..."
          />
        </div>
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
      const filteredInvitations = pendingInvitations.filter(inv => 
        !searchTerm || 
        inv.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredInvitations.length === 0) {
        content = <div className="p-8 text-center text-muted">No se encontraron invitaciones que coincidan con la búsqueda.</div>;
      } else {
        content = filteredInvitations.map(inv => (
          <div key={inv.token} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-b border-default transition-colors">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-main text-sm sm:text-base break-all">{inv.email}</div>
            <div className="text-xs text-muted">Invitado por: {inv.inviter?.fullName?.trim() || inv.inviter?.username || 'Usuario'} - Enviada: {new Date(inv.createdAt).toLocaleDateString()}</div>
          </div>
          <Button 
            variant="danger" 
            size="sm"
            className="self-end sm:self-auto shrink-0"
            onClick={() => setInvitationToDelete(inv)}
          >
            Eliminar
          </Button>
        </div>
      ));
      }
    }

    return (
      <>
        <SectionMessage message="En esta fase se puede revisar las invitaciones pendientes." />
        <div className="mb-4">
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por correo electrónico..."
          />
        </div>
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

        <DashboardTabs tabs={tabs} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSearchTerm(''); }} />

        <div className="w-full">
          {activeTab === 'workers' && renderWorkersTab()}
          {activeTab === 'invitations' && renderInvitationsTab()}
          {activeTab === 'audit-logs' && activeGalpon && (
            <AuditChangeLogTab galponId={activeGalpon.id} workers={workers} />
          )}
          {activeTab === 'system-logs' && activeGalpon && (
            <SystemAuditLogTab galponId={activeGalpon.id} />
          )}
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

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <UsersPageContent />
    </Suspense>
  );
}
