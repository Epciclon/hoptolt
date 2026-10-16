'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Utensils, Clock } from 'lucide-react';
import { useNotifications } from '../hooks/useNotification';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { useToast } from '@/shared/contexts/ToastContext';
import { Button } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { routeNotification } from '@/shared/utils/notificationRouting';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';


export function NotificationIcon() {
  const NOTIFICATION_LIMIT = 10;
  const { notifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications({ limit: NOTIFICATION_LIMIT });
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  
  // Previa especial de Recordatorio de Alimentación
  const [previewReminder, setPreviewReminder] = useState<any>(null);
  const dismissedRemindersRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const previousUnreadCountRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      // Check user activation to prevent Chrome autoplay warnings
      const hasInteracted = (window as any).__hasInteracted || (navigator.userActivation ? navigator.userActivation.hasBeenActive : false);
      
      if (AudioContext && hasInteracted) {
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
  };

  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current) {
      // New notification arrived - animar icono de campana como si repicara
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 2500);
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handleCloseNotifications = () => {
      setIsOpen(false);
    };
    window.addEventListener('close-notifications', handleCloseNotifications);
    
    // Global listener to track first interaction to safely play sounds
    if (typeof window !== 'undefined' && !(window as any).__interactionListenerAdded) {
      (window as any).__hasInteracted = false;
      const setInteracted = () => { (window as any).__hasInteracted = true; };
      window.addEventListener('click', setInteracted, { once: true, capture: true });
      window.addEventListener('keydown', setInteracted, { once: true, capture: true });
      (window as any).__interactionListenerAdded = true;
    }

    return () => window.removeEventListener('close-notifications', handleCloseNotifications);
  }, []);

  // Welcome Toast
  useEffect(() => {
    if (typeof window !== 'undefined' && unreadCount > 0 && notifications.length > 0 && user?.id) {
      const today = new Date().toDateString();
      const storageKey = `welcome_notif_${user.id}_${today}`;
      const shown = localStorage.getItem(storageKey);
      
      if (!shown) {
        localStorage.setItem(storageKey, 'true');
        
        const unreadList = notifications.filter(n => !n.read);
        if (unreadList.length > 0) {
          const warnings = unreadList.filter(n => n.type === 'warning');
          
          // Calculamos "avisos" sumando infos, invitaciones y lo que el backend indique en unreadCount
          const diff = unreadCount - unreadList.length;
          const totalInfos = unreadList.length - warnings.length + (diff > 0 ? diff : 0);
          
          const parts = [];
          if (warnings.length === 1) parts.push(`1 alerta importante`);
          else if (warnings.length > 1) parts.push(`${warnings.length} alertas importantes`);
          
          if (totalInfos === 1) parts.push(`1 aviso`);
          else if (totalInfos > 1) parts.push(`${totalInfos} avisos`);
          
          if (parts.length > 0) {
            const summary = parts.join(' y ');
            setTimeout(() => {
              showToast(`Tienes ${summary} pendientes. ¡Dales un vistazo!`, 'info');
            }, 1500);
          }
        }
      }
    }
  }, [unreadCount, notifications, showToast, user?.id]);

  const lastUserRef = useRef<string | null>(null);
  useEffect(() => {
    // Si cambia el usuario (login como otro usuario), limpiar marca de sesión anterior
    if (user?.id && lastUserRef.current && lastUserRef.current !== user.id) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`hoptolt_last_feeding_popup_${lastUserRef.current}`);
      }
      setPreviewReminder(null);
    }
    lastUserRef.current = user?.id || null;
  }, [user?.id]);

  // Previa temporal exclusiva para Recordatorio de Alimentación:
  // 1) Al iniciar sesión si no se ha alimentado (inmediato).
  // 2) Si se mantiene en el sistema, se muestra automáticamente cada 1 minuto sin requerir abrir/cerrar notificaciones.
  useEffect(() => {
    const checkAndShowFeedingReminder = () => {
      if (typeof window === 'undefined' || !user?.id) return;

      const feedingReminder = notifications.find(
        (n) => !n.read && n.data?.type === 'feeding_reminder'
      );

      if (!feedingReminder) {
        setPreviewReminder(null);
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      // Si el panel de notificaciones está abierto, no sobreponer la previa
      if (isOpen) return;

      const FEEDING_INTERVAL = 25 * 60 * 1000; // 25 minutos
      const now = Date.now();
      const storageIdKey = `hoptolt_last_feeding_popup_id_${user.id}`;
      const storageTimeKey = `hoptolt_last_feeding_popup_${user.id}`;
      const lastPopupId = typeof window !== 'undefined' ? localStorage.getItem(storageIdKey) : null;
      const lastPopupStr = typeof window !== 'undefined' ? localStorage.getItem(storageTimeKey) : null;
      const lastPopupTime = lastPopupStr ? Number.parseInt(lastPopupStr, 10) : 0;

      // Se sincroniza por ID de notificación: si el backend renueva la alerta, ambos usuarios
      // la reciben al mismo tiempo y se muestra simultáneamente.
      const isNewNotification = lastPopupId !== String(feedingReminder.id);
      const isTimeDue = lastPopupTime === 0 || (now - lastPopupTime >= FEEDING_INTERVAL);
      const shouldShow = isNewNotification || isTimeDue;

      if (shouldShow) {
        setPreviewReminder(feedingReminder);
        playNotificationSound();
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageIdKey, String(feedingReminder.id));
          localStorage.setItem(storageTimeKey, now.toString());
        }

        if (timerRef.current) clearTimeout(timerRef.current);

        const duration = 12000; // 12 segundos de visualización temporal
        timerRef.current = setTimeout(() => {
          setPreviewReminder(null);
        }, duration);
      }
    };

    // Verificar inmediatamente al cambiar notificaciones o al cerrar el panel
    checkAndShowFeedingReminder();

    // Y además evaluar periódicamente cada 3 segundos para que aparezca solo en cuanto se cumpla el minuto
    const interval = setInterval(checkAndShowFeedingReminder, 3000);

    return () => clearInterval(interval);
  }, [notifications, isOpen, user?.id, queryClient]);

  const handleClosePreview = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPreviewReminder(null);
  };

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
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/40 dark:border-yellow-900/60 dark:text-yellow-400';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400';
      case 'invitation':
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/40 dark:border-purple-900/60 dark:text-purple-400';
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
        console.error('Error marking notification as read:', error);
      }
    }
    routeNotification(notification, router);
    setIsOpen(false);
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    const getPriority = (item: any) => {
      if (item.type === 'warning' && item.data?.type === 'feeding_reminder') return 0;
      if (item.type === 'warning') return 1;
      return 2;
    };
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const displayedNotifications = sortedNotifications.slice(0, NOTIFICATION_LIMIT);
  const hasUnreadWarnings = notifications.some(n => !n.read && n.type === 'warning');

  return (
    <div className="relative">
      <button type="button"
        onClick={() => {
          if (previewReminder) {
            handleClosePreview();
          }
          const newState = !isOpen;
          setIsOpen(newState);
          if (newState && window.innerWidth < 1024) {
            window.dispatchEvent(new CustomEvent('close-sidebar'));
          }
        }}
        className="relative p-2 rounded-lg hover:bg-theme-surface border border-default transition-colors"
      >
        <Bell className={cn("w-5 h-5 text-muted transition-colors origin-top", 
          (unreadCount > 0 || isAnimating) && "animate-bell-ring text-primary-500"
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

      {/* Previa especial exclusiva de Recordatorio de Alimentación con el formato estándar */}
      {previewReminder && !isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full right-4 sm:right-0 left-4 sm:left-auto mt-2 w-auto sm:w-96 max-w-[calc(100vw-2rem)] bg-card rounded-xl shadow-lg border border-strong overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 border-b border-default flex justify-between items-center bg-theme-surface">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
              <h3 className="font-semibold text-main text-base m-0">Notificaciones</h3>
            </div>
            <button
              type="button"
              onClick={handleClosePreview}
              className="text-theme-faint hover:text-muted p-1 rounded hover:bg-theme-surface transition-colors cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>

          <div
            role="button"
            tabIndex={0}
            className="w-full text-left p-4 bg-primary-50/60 dark:bg-primary-900/20 hover:bg-theme-surface transition-colors cursor-pointer block focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={() => {
              const reminder = previewReminder;
              handleClosePreview();
              handleNotificationClick(reminder);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const reminder = previewReminder;
                handleClosePreview();
                handleNotificationClick(reminder);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', getTypeColor(previewReminder.type))}>
                {getIconByType(previewReminder.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-medium text-main text-sm flex items-center gap-2">
                    {previewReminder.title}
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                  </h4>
                </div>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  {previewReminder.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-default">
                  <p className="text-xs text-theme-faint">{formatTime(previewReminder.createdAt)}</p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      const reminder = previewReminder;
                      handleClosePreview();
                      handleNotificationClick(reminder);
                    }}
                    className="text-xs py-1 px-3 shadow-sm"
                  >
                    Ir a Alimentar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 border-t border-default bg-theme-surface">
            <Link
              href="/dashboard/notifications"
              onClick={handleClosePreview}
              className="w-full text-center block text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium py-1.5 hover:bg-theme-surface rounded transition-colors border-none cursor-pointer"
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}

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
                className="w-full text-center block text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium py-1.5 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors border-none cursor-pointer"
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
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'w-full text-left p-4 border-b border-default hover:bg-theme-surface transition-colors cursor-pointer block focus:outline-none focus:ring-2 focus:ring-primary-500',
                        !notification.read && 'bg-primary-50/60 dark:bg-primary-900/20'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(notification);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', getTypeColor(notification.type))}>
                          {getIconByType(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-medium text-main text-sm flex items-center gap-2">
                              {notification.title}
                              {!notification.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                              )}
                            </h4>
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
                          <p className="text-sm text-muted mt-1">
                            {notification.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </p>
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
                          {notification.data?.type === 'feeding_reminder' && (
                            <div className="mt-2.5 flex items-center justify-between gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                              <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                                Alimentación pendiente
                              </span>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="text-xs py-0.5 px-2.5 h-auto"
                              >
                                Alimentar
                              </Button>
                            </div>
                          )}
                          {notification.data?.type === 'cleaning_warning' && (
                            <div className="mt-2.5 flex flex-col gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                                  {notification.data.pendingCages?.length || notification.data.cagesCount || 0} jaulas sin limpiar
                                </span>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification);
                                  }}
                                  className="text-xs py-0.5 px-2.5 h-auto"
                                >
                                  Limpiar
                                </Button>
                              </div>
                              {notification.data.pendingCages && notification.data.pendingCages.length > 0 && (
                                <ul className="text-xs text-muted max-h-24 overflow-y-auto bg-card/60 rounded p-1 divide-y divide-default/40">
                                  {notification.data.pendingCages.slice(0, 5).map((cage: any) => (
                                    <li key={cage.cageId || cage.cageNumber} className="flex items-center justify-between py-0.5 px-1">
                                      <span className="font-medium text-main">Jaula {cage.cageNumber}</span>
                                      <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                                        {cage.daysWithoutCleaning}d
                                      </span>
                                    </li>
                                  ))}
                                  {notification.data.pendingCages.length > 5 && (
                                    <li className="italic text-theme-faint text-[10px] px-1 pt-0.5">
                                      ... y {notification.data.pendingCages.length - 5} jaulas más
                                    </li>
                                  )}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
