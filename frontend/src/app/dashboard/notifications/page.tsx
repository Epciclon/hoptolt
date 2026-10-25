'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { useToast } from '@/shared/contexts/ToastContext';
import { Bell, CheckCheck, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/modules/notification/types/notification.types';
import { useNotifications } from '@/modules/notification/hooks/useNotification';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { routeNotification } from '@/shared/utils/notificationRouting';
import { formatTime } from '@/shared/utils/dateUtils';

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  const [filter, setFilter] = useState<string>(initialFilter);
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    const qFilter = searchParams.get('filter');
    if (qFilter && qFilter !== filter) {
      setFilter(qFilter);
      setPage(1);
    }
  }, [searchParams]);

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
      showToast('Avisos marcados como leídos', 'success');
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
    const isActionableWarning = !notification.data?.isContract && (
      notification.data?.type === 'feeding_reminder' ||
      notification.data?.type === 'cleaning_warning' ||
      notification.data?.type === 'birth_warning' ||
      notification.data?.type === 'weaning_alert'
    );

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
            {filter !== 'alerts' && (
              <Button variant="outline" onClick={handleMarkAllRead} className="flex items-center gap-2">
                <CheckCheck size={18} />
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-default flex gap-2 overflow-x-auto bg-card">
          <Button 
            variant={filter === 'all' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('all')}
            className="rounded-full px-5 text-xs sm:text-sm shrink-0"
          >
            Todas
          </Button>
          <Button 
            variant={filter === 'unread' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('unread')}
            className="rounded-full px-5 text-xs sm:text-sm shrink-0"
          >
            No leídas
          </Button>
          <Button 
            variant={filter === 'read' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('read')}
            className="rounded-full px-5 text-xs sm:text-sm shrink-0"
          >
            Leídas
          </Button>
          <Button 
            variant={filter === 'alerts' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('alerts')}
            className="rounded-full px-5 text-xs sm:text-sm shrink-0"
          >
            Alertas
          </Button>
          <Button 
            variant={filter === 'notices' ? 'primary' : 'outline'} 
            onClick={() => handleFilterChange('notices')}
            className="rounded-full px-5 text-xs sm:text-sm shrink-0"
          >
            Avisos y Actividad
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
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
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
                          <span>{formatTime(notification.updatedAt || notification.createdAt)}</span>
                          {!(notification.type === 'warning' || notification.type === 'invitation' || notification.data?.isContract) && (
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
                                <p className="text-sm font-semibold text-main mb-2">Conejos actualizados • {notification.data.updatesCount}</p>
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

                      {notification.data?.type === 'cleaning_warning' && notification.data.pendingCages && notification.data.pendingCages.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-theme-surface border border-default">
                          <p className="text-sm font-semibold text-main mb-2.5">
                            Jaulas con falta de limpieza • {notification.data.pendingCages.length}
                          </p>
                          <ul className="text-sm text-main max-h-48 overflow-y-auto bg-card border border-default rounded-md p-2 divide-y divide-default">
                            {notification.data.pendingCages.map((cage: any) => (
                              <li key={cage.cageId || cage.cageNumber} className="flex items-center justify-between py-1.5 px-2">
                                <span className="font-medium text-main">Jaula {cage.cageNumber}</span>
                                <span className="text-xs font-medium text-main bg-theme-surface px-2.5 py-1 rounded-md border border-default">
                                  {cage.daysWithoutCleaning} {cage.daysWithoutCleaning === 1 ? 'día' : 'días'} sin limpieza
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {notification.data?.type === 'worker_action' && notification.data?.workersList && notification.data.workersList.length > 1 && (
                        <div className="mt-4 p-4 rounded-lg bg-theme-surface border border-default">
                          <p className="text-sm font-semibold text-main mb-2.5">
                            Detalle por trabajador • {(() => {
                              const total = notification.data.totalCount || notification.data.totalItems || 0;
                              const unit = notification.data.unitName || notification.data.unit || 'registro';
                              const unitLabel = total === 1 ? unit : (unit === 'jaula' ? 'jaulas' : (unit === 'conejo' ? 'conejos' : `${unit}s`));
                              return `${total} ${unitLabel} en total:`;
                            })()}
                          </p>
                          <ul className="text-sm text-main max-h-48 overflow-y-auto bg-card border border-default rounded-md p-2 divide-y divide-default">
                            {notification.data.workersList.map((worker: any) => {
                              const unit = notification.data.unitName || notification.data.unit || 'registro';
                              const workerUnit = worker.count === 1 ? unit : (unit === 'jaula' ? 'jaulas' : (unit === 'conejo' ? 'conejos' : `${unit}s`));
                              return (
                                <li key={worker.name} className="flex items-center justify-between py-1.5 px-2">
                                  <span className="font-medium text-main">{worker.name}</span>
                                  <span className="text-xs font-medium text-main bg-theme-surface px-2.5 py-1 rounded-md border border-default">
                                    {worker.count} {workerUnit}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {notification.data?.type === 'worker_sensitive_action' && notification.data?.modulesBreakdown && notification.data.modulesBreakdown.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-theme-surface border border-default">
                          <p className="text-sm font-semibold text-main mb-2.5">
                            Detalle por módulo sensible • {notification.data.changeCount || 0} {notification.data.changeCount === 1 ? 'cambio' : 'cambios'} en total:
                          </p>
                          <ul className="text-sm text-main max-h-48 overflow-y-auto bg-card border border-default rounded-md p-2 divide-y divide-default">
                            {notification.data.modulesBreakdown.map((m: any) => (
                              <li key={m.module} className="flex items-center justify-between py-1.5 px-2">
                                <span className="font-medium text-main">{m.label}</span>
                                <span className="text-xs font-medium text-main bg-theme-surface px-2.5 py-1 rounded-md border border-default">
                                  {m.count} {m.count === 1 ? 'cambio' : 'cambios'}
                                </span>
                              </li>
                            ))}
                          </ul>
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
