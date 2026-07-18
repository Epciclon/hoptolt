'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { useToast } from '@/shared/contexts/ToastContext';
import { Bell, CheckCheck, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/modules/notification/types/notification.types';
import { useNotifications } from '@/modules/notification/hooks/useNotification';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<string>('all');
  const { showToast } = useToast();
  const router = useRouter();
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const { refetchUser } = useAuthContext();
  const [accepting, setAccepting] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      showToast('Notificaciones marcadas como leídas', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al marcar notificaciones', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      showToast('Notificación eliminada', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar notificación', 'error');
    }
  };


  const handleAcceptInvitation = async (notification: Notification) => {
    const token = notification.data?.invitationToken;
    if (!token) return;

    setAccepting(notification.id);
    try {
      const success = await acceptInvitation(token);
      if (success) {
        showToast('¡Te has unido al galpón!', 'success');
        await deleteNotification(notification.id);
        await refetchUser(true);
      }
    } catch (error) {
      console.error(error);
      showToast('Error al aceptar la invitación', 'error');
    } finally {
      setAccepting(null);
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    const token = notification.data?.invitationToken;
    if (!token) return;

    setRejecting(notification.id);
    try {
      await revokeInvitation(token);
      showToast('Invitación rechazada', 'success');
      await deleteNotification(notification.id);
    } catch (error) {
      console.error(error);
      showToast('Error al rechazar la invitación', 'error');
    } finally {
      setRejecting(null);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Error al marcar como leída:', error);
      }
    }
    const type = notification.data?.type;

    if (type === 'worker_action' && notification.data?.module) {
      router.push(`/dashboard/${notification.data.module}?tab=historial`);
    } else if (type === 'reproduction_automated' || type === 'reproduction_manual') {
      const phase = notification.data?.phase;
      if (phase === 2) router.push('/dashboard/reproduction?tab=partos');
      else if (phase === 3) router.push('/dashboard/reproduction?tab=gazapos');
      else router.push('/dashboard/reproduction?tab=montas');
    } else if (type === 'birth_warning') {
      router.push('/dashboard/reproduction?tab=partos');
    } else if (type === 'weaning_alert') {
      router.push('/dashboard/reproduction?tab=gazapos');
    } else if (type === 'cleaning_warning') {
      router.push('/dashboard/cleaning');
    } else if (type === 'growth_summary') {
      router.push('/dashboard/conejos');
    } else if (notification.data?.galponId && (notification.type === 'success' || notification.type === 'invitation')) {
      router.push('/dashboard/galpones');
    }
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      case 'invitation': return '📨';
      default: return '•';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'invitation': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-theme-surface border-strong text-main';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'cleaning') return n.data?.type === 'cleaning_warning';
    if (filter === 'growth') return n.data?.type === 'growth_summary' || n.data?.type === 'weight_estimation' || n.data?.type === 'weight_estimations' || n.data?.type === 'age_update';
    if (filter === 'reproduction') return n.data?.type === 'birth_warning' || n.data?.type === 'weaning_alert' || n.data?.type === 'reproduction_manual' || n.data?.type === 'reproduction_automated';
    if (filter === 'activity') return n.data?.type === 'worker_action';
    if (filter === 'invitation') return n.type === 'invitation' || n.title?.includes('trabajador en tu galpón') || n.title?.includes('unido al galpón');
    return true;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden" padding="none">
        <div className="p-6 md:p-8 border-b border-default bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-main">Centro de Notificaciones</h1>
            <p className="text-muted mt-1">Gestiona todas las alertas y actualizaciones del sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleMarkAllRead} className="flex items-center gap-2">
              <CheckCheck size={18} />
              Marcar todas como leídas
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-default flex gap-2 overflow-x-auto bg-card">
          <Button 
            variant={filter === 'all' ? 'primary' : 'outline'} 
            onClick={() => setFilter('all')}
            className="rounded-full px-6"
          >
            Todas
          </Button>
          <Button 
            variant={filter === 'unread' ? 'primary' : 'outline'} 
            onClick={() => setFilter('unread')}
            className="rounded-full px-6"
          >
            No leídas
          </Button>
          <Button 
            variant={filter === 'growth' ? 'primary' : 'outline'} 
            onClick={() => setFilter('growth')}
            className="rounded-full px-6"
          >
            Crecimiento y Edad
          </Button>
          <Button 
            variant={filter === 'cleaning' ? 'primary' : 'outline'} 
            onClick={() => setFilter('cleaning')}
            className="rounded-full px-6"
          >
            Limpieza
          </Button>
          <Button 
            variant={filter === 'reproduction' ? 'primary' : 'outline'} 
            onClick={() => setFilter('reproduction')}
            className="rounded-full px-6"
          >
            Reproducción
          </Button>
          <Button 
            variant={filter === 'activity' ? 'primary' : 'outline'} 
            onClick={() => setFilter('activity')}
            className="rounded-full px-6"
          >
            Actividad
          </Button>
          <Button 
            variant={filter === 'invitation' ? 'primary' : 'outline'} 
            onClick={() => setFilter('invitation')}
            className="rounded-full px-6"
          >
            Invitaciones
          </Button>
        </div>

        <div className="p-0 bg-card">
          {(() => {
            if (loading) {
              return (
                <div className="p-12 text-center text-theme-faint">
                  <Clock className="w-8 h-8 animate-spin mx-auto mb-3" />
                  <p>Cargando notificaciones...</p>
                </div>
              );
            }

            if (filteredNotifications.length === 0) {
              return (
                <div className="p-16 text-center text-muted">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-main">No hay notificaciones</h3>
                  <p className="mt-1">No tienes alertas pendientes en esta categoría.</p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-slate-100">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "w-full text-left p-6 flex items-start gap-4 hover:bg-theme-surface transition-colors group cursor-pointer",
                      !notification.read && "bg-blue-50/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0', getTypeColor(notification.type))}>
                      {getIconByType(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-base font-semibold text-main flex items-center gap-2">
                            {notification.title}
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            )}
                          </h4>
                          <p className="text-muted mt-1 whitespace-pre-wrap">{notification.message}</p>
                        </div>
                        <div className="text-sm text-theme-faint flex flex-col items-end gap-2 shrink-0">
                          <span>{formatTime(notification.createdAt)}</span>
                          {!(notification.type === 'warning' || notification.type === 'invitation') && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-theme-faint hover:text-red-500 transition-opacity p-2"
                              title="Eliminar notificación"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {notification.data?.type === 'growth_summary' && (
                        <div className="mt-4 p-4 rounded-lg bg-theme-surface border border-default">
                          <div className="flex gap-6">
                            {notification.data.updatesCount > 0 && (
                              <div className="w-full">
                                <p className="text-sm font-semibold text-main mb-2">Conejos Actualizados ({notification.data.updatesCount})</p>
                                <ul className="text-xs text-muted list-disc list-inside space-y-1">
                                  {notification.data.details?.map((detail: string, i: number) => (
                                    <li key={`${detail}-${i}`}>{detail}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {notification.type === 'invitation' && (
                        <div className="mt-4 p-4 rounded-lg bg-theme-surface border border-default flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-main">Invitación a unirse a un galpón</p>
                            <p className="text-xs text-muted mt-1">Galpón: {notification.data?.galponName || 'Galpón'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={(e) => { e.stopPropagation(); handleAcceptInvitation(notification); }}
                              disabled={accepting === notification.id || rejecting === notification.id}
                            >
                              {accepting === notification.id ? 'Aceptando...' : 'Aceptar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => { e.stopPropagation(); handleRejectInvitation(notification); }}
                              disabled={accepting === notification.id || rejecting === notification.id}
                            >
                              {rejecting === notification.id ? 'Rechazando...' : 'Rechazar'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}
