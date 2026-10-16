'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useRouter } from 'next/navigation';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { useToast } from '@/shared/contexts/ToastContext';
import { Bell, CheckCheck, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/modules/notification/types/notification.types';
import { useNotifications } from '@/modules/notification/hooks/useNotification';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { routeNotification } from '@/shared/utils/notificationRouting';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  const { notifications, pagination, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications({
    page,
    limit,
    filter
  });

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };
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
    // Las advertencias del sistema (limpieza, parto, destete, alimentación) NO se deben marcar como leídas
    // solo por hacer clic o navegar, ya que el usuario aún no ha realizado la acción en el módulo.
    const isActionableWarning = notification.type === 'warning' ||
      notification.data?.type === 'feeding_reminder' ||
      notification.data?.type === 'cleaning_warning' ||
      notification.data?.type === 'birth_warning' ||
      notification.data?.type === 'weaning_alert';

    if (!notification.read && !isActionableWarning) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Error al marcar como leída:', error);
      }
    }
    routeNotification(notification, router);
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
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/60 text-yellow-800 dark:text-yellow-400';
      case 'info': return 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-400';
      case 'invitation': return 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-purple-800 dark:text-purple-400';
      default: return 'bg-theme-surface border border-strong text-main';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden" padding="none">
        <div className="p-6 md:p-8 border-b border-default bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-main">Centro de Notificaciones</h1>
            <p className="text-muted mt-1">Revisa los últimos avisos, recordatorios y actividades de tu granja</p>
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
            onClick={() => handleFilterChange('all')}
            className="rounded-full px-6"
          >
            Todas
          </Button>
          <Button 
            variant={filter === 'unread' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('unread')}
            className="rounded-full px-6"
          >
            No leídas
          </Button>
          <Button 
            variant={filter === 'feeding' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('feeding')}
            className="rounded-full px-6"
          >
            Alimentación
          </Button>
          <Button 
            variant={filter === 'growth' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('growth')}
            className="rounded-full px-6"
          >
            Crecimiento y Edad
          </Button>
          <Button 
            variant={filter === 'cleaning' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('cleaning')}
            className="rounded-full px-6"
          >
            Limpieza
          </Button>
          <Button 
            variant={filter === 'reproduction' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('reproduction')}
            className="rounded-full px-6"
          >
            Reproducción
          </Button>
          <Button 
            variant={filter === 'activity' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('activity')}
            className="rounded-full px-6"
          >
            Actividad
          </Button>
          <Button 
            variant={filter === 'invitation' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('invitation')}
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

            if (notifications.length === 0) {
              return (
                <div className="p-16 text-center text-muted">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-main">No hay notificaciones</h3>
                  <p className="mt-1">No tienes alertas pendientes en esta categoría.</p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-default">
                {notifications.map((notification) => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={notification.id}
                    className={cn(
                      "w-full text-left p-6 flex items-start gap-4 hover:bg-theme-surface transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500",
                      !notification.read && "bg-primary-50/60 dark:bg-primary-900/20"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
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
                              <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
                            )}
                          </h4>
                          <p className="text-muted mt-1 whitespace-pre-wrap">
                            {notification.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </p>
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

                      {notification.data?.type === 'feeding_reminder' && (
                        <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                            Tienes jaulas con conejos pendientes de alimentar en este turno.
                          </p>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className="self-start sm:self-auto"
                          >
                            Ir a Alimentar
                          </Button>
                        </div>
                      )}

                      {notification.data?.type === 'cleaning_warning' && (
                        <div className="mt-4 p-4 rounded-lg bg-theme-surface border border-default">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-main">
                                Jaulas con falta de limpieza ({notification.data.pendingCages?.length || notification.data.cagesCount || 0})
                              </p>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                              >
                                Ir a Limpieza
                              </Button>
                            </div>

                            {notification.data.pendingCages && notification.data.pendingCages.length > 0 && (
                              <ul className="text-sm text-main max-h-48 overflow-y-auto bg-card border border-default rounded-md p-2 divide-y divide-default">
                                {notification.data.pendingCages.map((cage: any) => (
                                  <li key={cage.cageId || cage.cageNumber} className="flex items-center justify-between py-1.5 px-2">
                                    <span className="font-medium text-main">Jaula {cage.cageNumber}</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                                      {cage.daysWithoutCleaning} {cage.daysWithoutCleaning === 1 ? 'día' : 'días'} sin limpieza
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
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

        {totalPages > 1 && (
          <div className="p-4 border-t border-default flex justify-center bg-card">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
