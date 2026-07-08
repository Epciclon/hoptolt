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
  const [limit, setLimit] = useState(10);
  const { notifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications({ limit });
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const { showToast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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

  const handleShowMore = () => {
    const newLimit = limit + 10;
    setLimit(newLimit);
    // React Query will automatically refetch when the option (limit) changes if we pass limit to the hook,
    // but useNotifications currently receives limit on initialization or via fetchNotifications.
    // Let's assume useNotifications is updated to accept options as a dependency.
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
      // growthService.respondToEstimation has been deprecated/removed.
      // Logic for responding to weights interactively is removed.
      showToast('Funcionalidad deprecada', 'info');
    } catch (error) {
      showToast('Error al procesar', 'error');
    } finally {
      setProcessingWeight(null);
    }
  };

  const handleRespondToWeightGrouped = async (notificationId: number, rabbitId: number, action: 'accept' | 'reject' | 'revert') => {
    setProcessingWeight(notificationId);
    try {
      // growthService.respondToEstimation has been deprecated/removed.
      // Logic for responding to weights interactively is removed.
      showToast('Funcionalidad deprecada', 'info');
    } catch (error) {
      showToast('Error al procesar', 'error');
    } finally {
      setProcessingWeight(null);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    if (notification.data?.type === 'birth_warning' && notification.data?.estimatedBirthDate) {
      router.push(`/dashboard?date=${notification.data.estimatedBirthDate}&reproductionId=${notification.data.reproductionId}`);
    } else if (notification.data?.type === 'cleaning_warning') {
      router.push('/dashboard/cleaning');
    } else if (notification.data?.galponId && (notification.type === 'success' || notification.type === 'invitation')) {
      router.push('/dashboard/galpones');
    } else if (notification.data?.type === 'weight_estimation' || notification.data?.type === 'age_update') {
      router.push('/dashboard/notifications');
    }
    setIsOpen(false);
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
          <div 
            role="button"
            tabIndex={0}
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(false); }}
            aria-label="Cerrar notificaciones"
          />
          <div className="fixed sm:absolute top-16 sm:top-full left-4 right-4 sm:left-auto sm:right-0 mt-2 w-auto sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 
                 role="button"
                 tabIndex={0}
                 onClick={() => {
                   router.push('/dashboard/notifications');
                   setIsOpen(false);
                 }}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     router.push('/dashboard/notifications');
                     setIsOpen(false);
                   }
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
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer',
                        !notification.read && 'bg-blue-50/50'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notification); }}
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
                          {notification.data?.type === 'growth_summary' && (
                            <div className="mt-2 bg-slate-100 rounded-md p-2 border border-slate-200">
                              <p className="text-xs text-slate-700 font-medium mb-1">
                                Actualizaciones ({notification.data.updatesCount || 0})
                              </p>
                              <ul className="text-xs text-slate-500 list-disc list-inside">
                                {notification.data.details?.slice(0, 3).map((detail: string, i: number) => (
                                  <li key={i} className="truncate">{detail}</li>
                                ))}
                                {notification.data.details?.length > 3 && (
                                  <li className="italic text-slate-400">... y {notification.data.details.length - 3} más</li>
                                )}
                              </ul>
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
