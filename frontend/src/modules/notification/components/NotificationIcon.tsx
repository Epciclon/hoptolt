'use client';

import { useState } from 'react';
import { Bell, X, CheckCheck, ChevronDown } from 'lucide-react';
import { useNotifications } from '../hooks/useNotification';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { useToast } from '@/shared/contexts/ToastContext';
import { Button } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { growthService } from '@/modules/growth/services/growth.service';

export function NotificationIcon() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, unreadCount, fetchNotifications } = useNotifications();
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const { showToast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [limit, setLimit] = useState(10);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [processingWeight, setProcessingWeight] = useState<number | null>(null);
  const [selectedRabbitForNotification, setSelectedRabbitForNotification] = useState<Record<number, number | null>>({});
  const getIconByType = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'invitation':
        return '📨';
      default:
        return '•';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'invitation':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return date.toLocaleDateString();
  };

  const handleShowMore = async () => {
    const newLimit = limit + 10;
    setLimit(newLimit);
    await fetchNotifications({ limit: newLimit });
  };

  const handleAcceptInvitation = async (notification: any) => {
    const token = notification.data?.invitationToken;
    if (!token) return;

    setAccepting(notification.id);
    try {
      const success = await acceptInvitation(token);
      if (success) {
        showToast('¡Te has unido al galpón!', 'success');
        markAsRead(notification.id);
        deleteNotification(notification.id);
      }
    } catch (error) {
      showToast('Error al aceptar la invitación', 'error');
    } finally {
      setAccepting(null);
    }
  };

  const handleRejectInvitation = async (notification: any) => {
    const token = notification.data?.invitationToken;
    if (!token) return;

    setRejecting(notification.id);
    try {
      await revokeInvitation(token);
      showToast('Invitación rechazada', 'success');
      markAsRead(notification.id);
      deleteNotification(notification.id);
    } catch (error) {
      showToast('Error al rechazar la invitación', 'error');
    } finally {
      setRejecting(null);
    }
  };

  const handleRespondToWeight = async (notification: any, action: 'accept' | 'reject' | 'revert') => {
    setProcessingWeight(notification.id);
    try {
      await growthService.respondToEstimation(notification.id, action);
      showToast(
        action === 'accept' ? 'Peso actualizado correctamente' :
        action === 'revert' ? 'Estimación revertida a pendiente' : 'Estimación rechazada',
        'success'
      );
      if (action !== 'revert') {
        markAsRead(notification.id);
      }
      // Actualizamos los notifications
      await fetchNotifications({ limit });
    } catch (error) {
      showToast('Error al procesar la estimación de peso', 'error');
    } finally {
      setProcessingWeight(null);
    }
  };

  const handleRespondToWeightGrouped = async (notificationId: number, rabbitId: number, action: 'accept' | 'reject' | 'revert') => {
    setProcessingWeight(notificationId);
    try {
      await growthService.respondToEstimation(notificationId, action, rabbitId);
      showToast(
        action === 'accept' ? 'Peso actualizado correctamente' :
        action === 'revert' ? 'Estimación revertida a pendiente' : 'Estimación rechazada',
        'success'
      );
      await fetchNotifications({ limit });
    } catch (error) {
      showToast('Error al procesar la estimación de peso', 'error');
    } finally {
      setProcessingWeight(null);
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    if (notification.data?.type === 'birth_warning' && notification.data?.estimatedBirthDate) {
      router.push(`/dashboard?date=${notification.data.estimatedBirthDate}&reproductionId=${notification.data.reproductionId}`);
      setIsOpen(false);
    } else if (notification.data?.type === 'cleaning_warning') {
      router.push('/dashboard/cleaning');
      setIsOpen(false);
    } else if (notification.data?.galponId && (notification.type === 'success' || notification.type === 'invitation')) {
      router.push('/dashboard/galpones');
      setIsOpen(false);
    } else if (notification.data?.type === 'weight_estimation' || notification.data?.type === 'age_update') {
      router.push('/dashboard/notifications');
      setIsOpen(false);
    }
  };

  const displayedNotifications = notifications.slice(0, limit);
  const hasMore = notifications.length > limit;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 
                 onClick={() => {
                   router.push('/dashboard/notifications');
                   setIsOpen(false);
                 }}
                 className="font-semibold text-slate-700 cursor-pointer hover:text-primary-600 transition-colors"
               >
                 Notificaciones
               </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <CheckCheck size={14} />
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <>
                  {displayedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors',
                        !notification.read && 'bg-blue-50/50'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', getTypeColor(notification.type))}>
                          {getIconByType(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-medium text-slate-800 text-sm">{notification.title}</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-2">{formatTime(notification.createdAt)}</p>
                          {notification.type === 'invitation' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptInvitation(notification);
                                }}
                                disabled={accepting === notification.id || rejecting === notification.id}
                              >
                                {accepting === notification.id ? 'Aceptando...' : 'Aceptar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectInvitation(notification);
                                }}
                                disabled={accepting === notification.id || rejecting === notification.id}
                              >
                                {rejecting === notification.id ? 'Rechazando...' : 'Rechazar'}
                              </Button>
                            </div>
                          )}
                          {notification.data?.type === 'weight_estimation' && (
                            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                              {notification.data.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleRespondToWeight(notification, 'accept')}
                                    disabled={processingWeight === notification.id}
                                  >
                                    {processingWeight === notification.id ? 'Procesando...' : 'Aceptar Cambio'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleRespondToWeight(notification, 'reject')}
                                    disabled={processingWeight === notification.id}
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              {notification.data.status === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={() => handleRespondToWeight(notification, 'revert')}
                                  disabled={processingWeight === notification.id}
                                >
                                  Revertir
                                </Button>
                              )}
                              {notification.data.status === 'accepted' && (
                                <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                                  ✓ Guardado
                                </span>
                              )}
                            </div>
                          )}
                          {notification.data?.type === 'weight_estimations' && (
                            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Peso Estimado Conejos:
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {(notification.data.rabbits || []).map((rabbit: any) => {
                                  const isSelected = selectedRabbitForNotification[notification.id] === rabbit.rabbitId;
                                  return (
                                    <div 
                                      key={rabbit.rabbitId}
                                      onClick={() => {
                                        if (rabbit.status === 'pending' || rabbit.status === 'rejected') {
                                          setSelectedRabbitForNotification(prev => ({
                                            ...prev,
                                            [notification.id]: isSelected ? null : rabbit.rabbitId
                                          }));
                                        }
                                      }}
                                      className={cn(
                                        "p-2 rounded-lg border transition-colors flex items-center justify-between text-xs",
                                        isSelected ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100",
                                        (rabbit.status === 'pending' || rabbit.status === 'rejected') && "cursor-pointer"
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-semibold text-slate-700 shrink-0">{rabbit.rabbitCode}</span>
                                        {rabbit.rabbitName && <span className="text-slate-500 text-[10px] truncate">({rabbit.rabbitName})</span>}
                                      </div>

                                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {isSelected && rabbit.status === 'pending' && (
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="primary"
                                              className="h-6 text-[10px] px-2 py-0"
                                              onClick={() => handleRespondToWeightGrouped(notification.id, rabbit.rabbitId, 'accept')}
                                              disabled={processingWeight === notification.id}
                                            >
                                              Aceptar
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="danger"
                                              className="h-6 text-[10px] px-2 py-0"
                                              onClick={() => handleRespondToWeightGrouped(notification.id, rabbit.rabbitId, 'reject')}
                                              disabled={processingWeight === notification.id}
                                            >
                                              Rechazar
                                            </Button>
                                          </div>
                                        )}

                                        {isSelected && rabbit.status === 'rejected' && (
                                          <Button
                                            size="sm"
                                            variant="warning"
                                            className="h-6 text-[10px] px-2 py-0"
                                            onClick={() => handleRespondToWeightGrouped(notification.id, rabbit.rabbitId, 'revert')}
                                            disabled={processingWeight === notification.id}
                                          >
                                            Revertir
                                          </Button>
                                        )}

                                        {(!isSelected || rabbit.status === 'accepted') && (
                                          <div className="flex items-center gap-1 font-medium text-[10px]">
                                            <span className="text-slate-500">{rabbit.estimatedWeight} kg</span>
                                            {rabbit.status === 'accepted' && <span className="text-green-600 font-bold">✓ Guardado</span>}
                                            {rabbit.status === 'rejected' && <span className="text-red-500 font-bold">✕ (Revertir)</span>}
                                            {rabbit.status === 'pending' && <span className="text-blue-500 font-bold">•</span>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      router.push('/dashboard/notifications');
                      setIsOpen(false);
                    }}
                    className="w-full p-3 text-sm text-primary-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 border-t border-slate-100 font-medium"
                  >
                    Ver todas las notificaciones
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
