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
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { playNotificationSound } from '@/shared/utils/soundUtils';
import { formatTime } from '@/shared/utils/dateUtils';

export function NotificationIcon() {
  const NOTIFICATION_LIMIT = 15;
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications({ limit: NOTIFICATION_LIMIT, filter: 'notices' });
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);

  // Previa Flotante de Avisos y Novedades
  const [activeInfoPreview, setActiveInfoPreview] = useState<any>(null);
  const activeInfoRef = useRef<any>(null);
  const infoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previewNotificationsEnabled, setPreviewNotificationsEnabled] = useState(true);

  useEffect(() => {
    const syncSetting = () => {
      const enabled = typeof window !== 'undefined' ? localStorage.getItem('hoptolt_preview_notifications') !== 'false' : true;
      setPreviewNotificationsEnabled(enabled);
      if (!enabled) {
        if (infoTimerRef.current) {
          clearTimeout(infoTimerRef.current);
          infoTimerRef.current = null;
        }
        activeInfoRef.current = null;
        setActiveInfoPreview(null);
      }
    };
    syncSetting();
    window.addEventListener('hoptolt_previews_changed', syncSetting);
    window.addEventListener('storage', syncSetting);
    return () => {
      window.removeEventListener('hoptolt_previews_changed', syncSetting);
      window.removeEventListener('storage', syncSetting);
    };
  }, []);

  const [alertOffset, setAlertOffset] = useState<number>(0);

  useEffect(() => {
    const handleAlertChange = (e: any) => {
      if (e.detail?.active && typeof e.detail?.height === 'number') {
        setAlertOffset(e.detail.height + 12);
      } else {
        setAlertOffset(0);
      }
    };
    window.addEventListener('hoptolt_alert_preview_change', handleAlertChange);

    const checkInitial = () => {
      const el = document.getElementById('hoptolt-alert-preview');
      if (el) {
        setAlertOffset(el.getBoundingClientRect().height + 12);
      }
    };
    checkInitial();

    return () => {
      window.removeEventListener('hoptolt_alert_preview_change', handleAlertChange);
    };
  }, []);

  const isWarningNotification = (n: any) => {
    const t = n.data?.type;
    if (t === 'incident' || t === 'incident_response') return false;
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    if (title.includes('novedad') || msg.includes('novedad')) return false;

    return n.type === 'warning' ||
      t === 'feeding_reminder' ||
      t === 'cleaning_warning' ||
      t === 'birth_warning' ||
      t === 'weaning_alert';
  };

  const getInfoWeight = (n: any) => {
    if (n.type === 'invitation') return 100;
    const t = n.data?.type;
    const isAssignment = t === 'task_assignment' || (n.title && n.title.toLowerCase().includes('asignaci'));
    if (isAssignment) return 95;
    if (t === 'worker_action' || t === 'worker_sensitive_action') return 90;
    if (t === 'reproduction') return 70;
    if (t === 'maturity') return 60;
    if (t === 'growth_summary' || t === 'growth') return 50;
    return 30;
  };

  const getActionConfig = (notification: any) => {
    const type = notification.data?.type;
    const isAssignment = type === 'task_assignment' || (notification.title && notification.title.toLowerCase().includes('asignaci'));
    if (isAssignment) {
      return { label: 'Entendido', variant: 'primary' as const };
    }
    if (type === 'worker_sensitive_action') {
      return { label: 'Ver Cambios', variant: 'primary' as const };
    }
    if (type === 'worker_action') {
      return { label: 'Ver Historial', variant: 'outline' as const };
    }
    if (type === 'growth_summary') {
      return { label: 'Ver Crecimiento', variant: 'outline' as const };
    }
    if (type === 'maturity') {
      return { label: 'Ver Conejos', variant: 'outline' as const };
    }
    return { label: 'Ver Detalle', variant: 'outline' as const };
  };

  const getNotificationVersion = (n: any) => {
    const logId = n.data?.lastLogId || n.data?.logId || 0;
    const count = n.data?.changeCount || n.data?.totalCount || 1;
    const time = new Date(n.updatedAt || n.createdAt).getTime();
    return `${n.id}_${logId}_${count}_${time}`;
  };

  const isPreviewSeenOrDismissed = (n: any, userId: string) => {
    if (typeof window === 'undefined') return false;
    const version = getNotificationVersion(n);
    const id = n.id;
    return (
      sessionStorage.getItem(`hoptolt_prev_seen_${userId}_${id}_${version}`) === 'true' ||
      localStorage.getItem(`hoptolt_prev_seen_${userId}_${id}_${version}`) === 'true' ||
      sessionStorage.getItem(`hoptolt_prev_dismissed_${userId}_${id}_${version}`) === 'true' ||
      localStorage.getItem(`hoptolt_prev_dismissed_${userId}_${id}_${version}`) === 'true'
    );
  };

  const markPreviewSeen = (n: any, userId: string) => {
    if (typeof window !== 'undefined') {
      const version = getNotificationVersion(n);
      sessionStorage.setItem(`hoptolt_prev_seen_${userId}_${n.id}_${version}`, 'true');
      localStorage.setItem(`hoptolt_prev_seen_${userId}_${n.id}_${version}`, 'true');
    }
  };

  const markPreviewDismissed = (n: any, userId: string) => {
    if (typeof window !== 'undefined') {
      const version = getNotificationVersion(n);
      sessionStorage.setItem(`hoptolt_prev_dismissed_${userId}_${n.id}_${version}`, 'true');
      localStorage.setItem(`hoptolt_prev_dismissed_${userId}_${n.id}_${version}`, 'true');
    }
  };

  const isInitialMountRef = useRef(true);
  const previousUnreadInfosCountRef = useRef(0);
  const previousTotalChangesRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Filtrado exclusivo de avisos generales y actividades
  const infoNotifications = notifications.filter(n => !isWarningNotification(n));
  const unreadInfos = infoNotifications.filter(n => !n.read);
  const unreadInfosCount = unreadCount !== undefined ? unreadCount : unreadInfos.length;
  const remainingInfosCount = Math.max(0, unreadInfosCount - 1);
  const totalChanges = unreadInfos.reduce((sum: number, n: any) => sum + (n.data?.changeCount || 1), 0);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousUnreadInfosCountRef.current = unreadInfosCount;
      previousTotalChangesRef.current = totalChanges;
      return;
    }

    if (unreadInfosCount > previousUnreadInfosCountRef.current || totalChanges > previousTotalChangesRef.current) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 2500);
    }
    previousUnreadInfosCountRef.current = unreadInfosCount;
    previousTotalChangesRef.current = totalChanges;
  }, [unreadInfosCount, totalChanges]);

  useEffect(() => {
    const handleCloseNotifications = () => {
      setTimeout(() => {
        setIsOpen(false);
      }, 0);
    };
    window.addEventListener('close-notifications', handleCloseNotifications);

    return () => window.removeEventListener('close-notifications', handleCloseNotifications);
  }, []);

  const lastUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.id && lastUserRef.current && lastUserRef.current !== user.id) {
      if (infoTimerRef.current) {
        clearTimeout(infoTimerRef.current);
        infoTimerRef.current = null;
      }
      activeInfoRef.current = null;
      setActiveInfoPreview(null);
    }
    lastUserRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    };
  }, []);

  // Previa Flotante Informativa con sonido de notificación
  useEffect(() => {
    if (isOpen || !previewNotificationsEnabled) {
      if (infoTimerRef.current) {
        clearTimeout(infoTimerRef.current);
        infoTimerRef.current = null;
      }
      activeInfoRef.current = null;
      setActiveInfoPreview(null);
      return;
    }
    if (typeof window === 'undefined' || !user?.id) return;

    const now = Date.now();
    const userId = user.id;

    if (activeInfoRef.current) {
      const currentActive = unreadInfos.find(n => n.id === activeInfoRef.current.id);
      if (!currentActive) {
        if (infoTimerRef.current) {
          clearTimeout(infoTimerRef.current);
          infoTimerRef.current = null;
        }
        activeInfoRef.current = null;
        setActiveInfoPreview(null);
      } else {
        const currentVersion = getNotificationVersion(currentActive);
        const refVersion = getNotificationVersion(activeInfoRef.current);
        if (currentVersion !== refVersion) {
          activeInfoRef.current = currentActive;
          setActiveInfoPreview(currentActive);
          markPreviewSeen(currentActive, userId);
          playNotificationSound();

          if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
          infoTimerRef.current = setTimeout(() => {
            activeInfoRef.current = null;
            setActiveInfoPreview(null);
            infoTimerRef.current = null;
          }, 14000);
        }
      }
    }

    if (!activeInfoRef.current) {
      const sortedCandidates = [...unreadInfos].sort((a, b) => {
        const wA = getInfoWeight(a);
        const wB = getInfoWeight(b);
        if (wA !== wB) return wB - wA;
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      const candidateInfo = sortedCandidates.find(n => {
        if (isPreviewSeenOrDismissed(n, userId)) return false;

        const isAssignment = n.data?.type === 'task_assignment' || (n.title && n.title.toLowerCase().includes('asignaci'));
        if (n.type === 'invitation' || isAssignment) return true;

        const notifTime = new Date(n.updatedAt || n.createdAt).getTime();
        const diffMs = Math.abs(now - notifTime);
        return diffMs < (10 * 60 * 1000);
      }) || null;

      if (candidateInfo) {
        activeInfoRef.current = candidateInfo;
        setActiveInfoPreview(candidateInfo);
        markPreviewSeen(candidateInfo, userId);
        playNotificationSound();

        if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
        infoTimerRef.current = setTimeout(() => {
          activeInfoRef.current = null;
          setActiveInfoPreview(null);
          infoTimerRef.current = null;
        }, 14000);
      }
    }
  }, [unreadInfos, isOpen, user?.id, previewNotificationsEnabled]);

  const handleCloseInfoPreview = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (infoTimerRef.current) {
      clearTimeout(infoTimerRef.current);
      infoTimerRef.current = null;
    }
    const currentItem = activeInfoRef.current || activeInfoPreview;
    if (currentItem && user?.id) {
      markPreviewDismissed(currentItem, user.id);
    }
    activeInfoRef.current = null;
    setActiveInfoPreview(null);
  };

  const getIconByType = (type: string) => {
    switch (type) {
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
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400';
      case 'invitation':
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/40 dark:border-purple-900/60 dark:text-purple-400';
      default:
        return 'bg-theme-surface border-strong text-main';
    }
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

  const sortedNotifications = [...infoNotifications].sort((a, b) => {
    const pA = getInfoWeight(a);
    const pB = getInfoWeight(b);
    if (pA !== pB) return pB - pA;
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  const displayedNotifications = sortedNotifications.slice(0, NOTIFICATION_LIMIT);

  return (
    <div className="relative">
      <button
        type="button"
        title="Notificaciones"
        onClick={() => {
          handleCloseInfoPreview();
          window.dispatchEvent(new CustomEvent('close-alerts'));
          const newState = !isOpen;
          setIsOpen(newState);
          if (newState && window.innerWidth < 1024) {
            window.dispatchEvent(new CustomEvent('close-sidebar'));
          }
        }}
        className={cn(
          "relative p-2 rounded-lg border transition-all duration-200",
          isOpen
            ? "bg-theme-surface border-default text-main"
            : "border-default hover:bg-theme-surface text-muted"
        )}
      >
        <Bell
          className={cn(
            "w-5 h-5 transition-transform origin-top text-muted",
            unreadInfosCount > 0 && "animate-bell-ring text-primary-600 dark:text-primary-400"
          )}
        />
        {unreadInfosCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white shadow-sm pointer-events-none animate-badge-pop"
          >
            {unreadInfosCount > 9 ? '9+' : unreadInfosCount}
          </span>
        )}
      </button>

      {activeInfoPreview && !isOpen && (
        <div
          style={{ top: alertOffset > 0 ? `calc(4rem + ${alertOffset}px)` : '4rem' }}
          className="fixed right-3 sm:right-6 left-3 sm:left-auto w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] flex flex-col gap-2.5 z-[60] pointer-events-none transition-[top] duration-300 ease-out"
        >
          <div className="pointer-events-auto bg-card rounded-xl shadow-xl border border-blue-300 dark:border-blue-800/70 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-3.5 py-2 border-b border-default flex justify-between items-center bg-blue-500/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="font-semibold text-blue-900 dark:text-blue-300 text-xs uppercase tracking-wider">
                  {activeInfoPreview.type === 'invitation'
                    ? 'Invitación'
                    : (activeInfoPreview.data?.type === 'task_assignment' || activeInfoPreview.title?.toLowerCase().includes('asignaci'))
                    ? 'Nueva Asignación'
                    : 'Aviso de Actividad'}
                </span>
                {remainingInfosCount > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
                    + {remainingInfosCount} más
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseInfoPreview}
                className="text-theme-faint hover:text-muted p-1 rounded hover:bg-theme-surface transition-colors cursor-pointer"
                aria-label="Cerrar aviso"
              >
                <X size={15} />
              </button>
            </div>

            <div
              role="button"
              tabIndex={0}
              className="w-full text-left p-4 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-theme-surface transition-colors cursor-pointer block focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => {
                if (activeInfoPreview.type !== 'invitation') {
                  const item = activeInfoPreview;
                  handleCloseInfoPreview();
                  handleNotificationClick(item);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && activeInfoPreview.type !== 'invitation') {
                  e.preventDefault();
                  const item = activeInfoPreview;
                  handleCloseInfoPreview();
                  handleNotificationClick(item);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0', getTypeColor(activeInfoPreview.type))}>
                  {getIconByType(activeInfoPreview.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-main text-sm flex items-center gap-2">
                    {activeInfoPreview.title}
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  </h4>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {activeInfoPreview.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </p>

                  {activeInfoPreview.data?.workersList && activeInfoPreview.data.workersList.length > 1 && (
                    <div className="mt-2 p-1.5 bg-card/70 rounded border border-default text-xs flex flex-wrap gap-x-3 gap-y-1">
                      {activeInfoPreview.data.workersList.map((w: any) => (
                        <span key={w.name} className="inline-flex items-center gap-1">
                          <span className="font-medium text-main">{w.name}:</span>
                          <span className="font-semibold text-main">{w.count}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {activeInfoPreview.data?.type === 'worker_sensitive_action' && activeInfoPreview.data?.modulesBreakdown && activeInfoPreview.data.modulesBreakdown.length > 0 && (
                    <div className="mt-2.5 p-2 bg-theme-surface rounded-lg border border-default text-xs">
                      <ul className="divide-y divide-default bg-card rounded border border-default max-h-28 overflow-y-auto">
                        {activeInfoPreview.data.modulesBreakdown.map((m: any) => (
                          <li key={m.module} className="flex items-center justify-between py-1 px-2.5">
                            <span className="font-medium text-main">{m.label}</span>
                            <span className="text-[10px] font-medium text-main bg-theme-surface px-2 py-0.5 rounded border border-default">
                              {m.count} {m.count === 1 ? 'cambio' : 'cambios'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-default">
                    <p className="text-xs text-theme-faint">{formatTime(activeInfoPreview.updatedAt || activeInfoPreview.createdAt)}</p>

                    {activeInfoPreview.type === 'invitation' ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectInvitation(activeInfoPreview);
                          }}
                          disabled={accepting === activeInfoPreview.id || rejecting === activeInfoPreview.id}
                          className="text-xs py-1 px-2.5 h-auto shadow-sm"
                        >
                          {rejecting === activeInfoPreview.id ? 'Rechazando...' : 'Rechazar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptInvitation(activeInfoPreview);
                          }}
                          disabled={accepting === activeInfoPreview.id || rejecting === activeInfoPreview.id}
                          className="text-xs py-1 px-2.5 h-auto shadow-sm"
                        >
                          {accepting === activeInfoPreview.id ? 'Aceptando...' : 'Aceptar'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={getActionConfig(activeInfoPreview).variant}
                        onClick={(e) => {
                          e.stopPropagation();
                          const item = activeInfoPreview;
                          handleCloseInfoPreview();
                          handleNotificationClick(item);
                        }}
                        className="text-xs py-1 px-3 shadow-sm h-auto"
                      >
                        {getActionConfig(activeInfoPreview).label}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popover de Notificaciones */}
      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/20 sm:bg-transparent border-none w-full h-full cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar notificaciones"
          />
          <div className="fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-card rounded-xl shadow-2xl border border-strong overflow-hidden z-[60] flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[520px]">
            <div className="p-3.5 border-b border-default flex flex-col gap-2.5 bg-theme-surface shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <h3 className="font-semibold text-main text-sm m-0">Notificaciones</h3>
                </div>
                {unreadInfosCount > 0 && (
                  <button
                    type="button"
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
                className="w-full text-center block text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium py-1.5 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors border-none cursor-pointer"
              >
                Ver todas las notificaciones
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-default/60 overscroll-contain">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-main">Sin notificaciones pendientes</p>
                  <p className="text-xs text-theme-faint mt-1">Aquí verás la actividad y avisos del equipo</p>
                </div>
              ) : (
                displayedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'w-full text-left p-3.5 hover:bg-theme-surface transition-colors cursor-pointer block focus:outline-none focus:ring-2 focus:ring-primary-500',
                      !notification.read && 'bg-primary-50/40 dark:bg-primary-900/15'
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
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5', getTypeColor(notification.type))}>
                        {getIconByType(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-main text-xs sm:text-sm flex items-center gap-1.5">
                            {notification.title}
                            {!notification.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block shrink-0" />
                            )}
                          </h4>
                          {notification.type !== 'invitation' && (
                            <button
                              type="button"
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
                              className="text-theme-faint hover:text-muted p-0.5"
                              aria-label="Eliminar notificación"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {notification.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                        <p className="text-xs text-theme-faint mt-2 font-medium">{formatTime(notification.updatedAt || notification.createdAt)}</p>

                        {notification.type === 'invitation' && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptInvitation(notification);
                              }}
                              disabled={accepting === notification.id || rejecting === notification.id}
                              className="text-xs py-1 px-3"
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
                              className="text-xs py-1 px-3"
                            >
                              {rejecting === notification.id ? 'Rechazando...' : 'Rechazar'}
                            </Button>
                          </div>
                        )}

                        {notification.data?.type === 'growth_summary' && (
                          <div className="mt-2 bg-theme-surface border border-default rounded-md p-2">
                            <p className="text-xs text-main font-medium mb-1">
                              Actualizaciones • {notification.data.updatesCount || 0}
                            </p>
                            <ul className="text-xs text-muted list-disc list-inside">
                              {notification.data.details?.slice(0, 3).map((detail: string) => (
                                <li key={detail} className="truncate">{detail}</li>
                              ))}
                              {notification.data.details?.length > 3 && (
                                <li className="italic text-theme-faint">... y más registros</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {notification.data?.type === 'worker_action' && notification.data?.workersList && notification.data.workersList.length > 1 && (
                          <div className="mt-2 flex flex-col gap-1 p-2 rounded-md bg-theme-surface border border-default">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-main font-medium">
                                Detalle por trabajador • {notification.data.totalCount || notification.data.totalItems || 0} {notification.data.unitName || notification.data.unit || 'registro'}s en total:
                              </span>
                            </div>
                            <ul className="text-[11px] text-main max-h-24 overflow-y-auto bg-card rounded p-1 border border-default divide-y divide-default">
                              {notification.data.workersList.map((worker: any) => (
                                <li key={worker.name} className="flex items-center justify-between py-1 px-1.5">
                                  <span className="font-medium text-main">{worker.name}</span>
                                  <span className="text-[10px] font-medium text-main bg-theme-surface px-1.5 py-0.5 rounded border border-default">
                                    {worker.count} {notification.data.unitName || notification.data.unit || 'registro'}{worker.count === 1 ? '' : 's'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {notification.data?.type === 'worker_sensitive_action' && notification.data?.modulesBreakdown && notification.data.modulesBreakdown.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1 p-2 rounded-md bg-theme-surface border border-default">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-main font-medium">
                                Detalle por módulo sensible:
                              </span>
                            </div>
                            <ul className="text-[11px] text-main max-h-32 overflow-y-auto bg-card rounded p-1 border border-default divide-y divide-default">
                              {notification.data.modulesBreakdown.map((m: any) => (
                                <li key={m.module} className="flex items-center justify-between py-1 px-2">
                                  <span className="font-medium text-main">{m.label}</span>
                                  <span className="text-[10px] font-medium text-main bg-theme-surface px-2 py-0.5 rounded border border-default">
                                    {m.count} {m.count === 1 ? 'cambio' : 'cambios'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
