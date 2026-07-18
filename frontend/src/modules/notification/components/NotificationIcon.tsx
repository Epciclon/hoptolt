'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotification';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { useToast } from '@/shared/contexts/ToastContext';
import { Button } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { routeNotification } from '@/shared/utils/notificationRouting';


export function NotificationIcon() {
  const NOTIFICATION_LIMIT = 10;
  const { notifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications({ limit: NOTIFICATION_LIMIT });
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const { showToast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  
  const previousUnreadCountRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current) {
      // New notification arrived!
      setIsAnimating(true);
      
      // Play sound
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        console.error('Error playing notification sound:', e);
      }

      // Stop animation after 2s
      setTimeout(() => {
        setIsAnimating(false);
      }, 2000);
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handleCloseNotifications = () => {
      setIsOpen(false);
    };
    window.addEventListener('close-notifications', handleCloseNotifications);
    return () => window.removeEventListener('close-notifications', handleCloseNotifications);
  }, []);

  const getIconByType = (type: string) => {
    switch (type) {
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
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'invitation':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-theme-surface border-strong text-main';
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
      console.error(error);
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
      console.error(error);
      showToast('Error al rechazar la invitación', 'error');
    } finally {
      setRejecting(null);
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
    routeNotification(notification, router);
    setIsOpen(false);
  };

  const displayedNotifications = notifications.slice(0, NOTIFICATION_LIMIT);
  const hasUnreadWarnings = notifications.some(n => !n.read && n.type === 'warning');

  return (
    <div className="relative">
      <button type="button"
        onClick={() => {
          const newState = !isOpen;
          setIsOpen(newState);
          if (newState && window.innerWidth < 1024) {
            window.dispatchEvent(new CustomEvent('close-sidebar'));
          }
        }}
        className="relative p-2 rounded-lg hover:bg-theme-surface border border-default transition-colors"
      >
        <Bell className={cn("w-5 h-5 text-muted transition-colors", 
          isAnimating && "animate-bounce text-primary-500"
        )} />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute top-0 right-0 flex min-w-[16px] h-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm pointer-events-none",
            hasUnreadWarnings ? "animate-bounce" : "animate-pulse"
          )}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button 
            type="button"
            className="fixed inset-0 z-40 bg-transparent border-none w-full h-full cursor-default" 
            onClick={() => setIsOpen(false)} 
            aria-label="Cerrar notificaciones"
          />
          <div className="fixed sm:absolute top-16 sm:top-full right-4 sm:right-0 left-4 sm:left-auto mt-2 w-auto sm:w-96 max-w-[calc(100vw-2rem)] bg-card rounded-xl shadow-lg border border-strong overflow-hidden z-50">
            <div className="p-4 border-b border-default flex flex-col gap-3 bg-theme-surface">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-main text-base m-0">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button type="button"
                    onClick={() => markAllAsRead()}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium bg-transparent border-none p-0 cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    Marcar leídas
                  </button>
                )}
              </div>
              <Link
                href="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                className="w-full text-center block text-sm text-primary-600 hover:text-primary-700 font-medium py-1.5 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors border-none cursor-pointer"
              >
                Ver todas las notificaciones
              </Link>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <>
                  {displayedNotifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      className={cn(
                        'w-full text-left p-4 border-b border-default hover:bg-theme-surface transition-colors cursor-pointer block focus:outline-none focus:ring-2 focus:ring-primary-500',
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
                            <h4 className="font-medium text-main text-sm">{notification.title}</h4>
                            {!(notification.type === 'warning' || notification.type === 'invitation') && (
                              <button type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await deleteNotification(notification.id);
                                    showToast('Notificación eliminada', 'success');
                                  } catch (error) {
                                    console.error(error);
                                    showToast('Error al eliminar notificación', 'error');
                                  }
                                }}
                                className="text-theme-faint hover:text-muted"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted mt-1">{notification.message}</p>
                          <p className="text-xs text-theme-faint mt-2">{formatTime(notification.createdAt)}</p>
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
                            <div className="mt-2 bg-theme-surface border border-default rounded-md p-2 border border-strong">
                              <p className="text-xs text-main font-medium mb-1">
                                Actualizaciones ({notification.data.updatesCount || 0})
                              </p>
                              <ul className="text-xs text-muted list-disc list-inside">
                                {notification.data.details?.slice(0, 3).map((detail: string) => (
                                  <li key={detail} className="truncate">{detail}</li>
                                ))}
                                {notification.data.details?.length > 3 && (
                                  <li className="italic text-theme-faint">... y {notification.data.details.length - 3} más</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
