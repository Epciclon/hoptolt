'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotification';
import { useToast } from '@/shared/contexts/ToastContext';
import { Button } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { routeNotification } from '@/shared/utils/notificationRouting';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { playWarningAlertSound } from '@/shared/utils/soundUtils';
import { formatTime } from '@/shared/utils/dateUtils';

export function AlertsIcon() {
  const ALERTS_LIMIT = 15;
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications({ limit: ALERTS_LIMIT, filter: 'alerts' });
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Previa Flotante de Alerta
  const [activeWarningPreview, setActiveWarningPreview] = useState<any>(null);
  const activeWarningRef = useRef<any>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previewAlertsEnabled, setPreviewAlertsEnabled] = useState(true);

  useEffect(() => {
    const syncSetting = () => {
      const enabled = typeof window !== 'undefined' ? localStorage.getItem('hoptolt_preview_alerts') !== 'false' : true;
      setPreviewAlertsEnabled(enabled);
      if (!enabled) {
        if (warningTimerRef.current) {
          clearTimeout(warningTimerRef.current);
          warningTimerRef.current = null;
        }
        activeWarningRef.current = null;
        setActiveWarningPreview(null);
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

  const getWarningWeight = (n: any) => {
    if (n.data?.isContract) return 95;
    const t = n.data?.type;
    if (t === 'feeding_reminder') return 100;
    if (t === 'birth_warning') return 90;
    if (t === 'weaning_alert') return 80;
    if (t === 'cleaning_warning') return 70;
    if (n.type === 'warning') return 60;
    return 10;
  };

  const getActionConfig = (notification: any) => {
    if (notification.data?.isContract) {
      return { label: 'Entendido', variant: 'outline' as const };
    }
    const type = notification.data?.type;
    if (type === 'feeding_reminder') {
      return { label: 'Ir a Alimentar', variant: 'primary' as const };
    }
    if (type === 'cleaning_warning') {
      return { label: 'Ir a Limpiar', variant: 'primary' as const };
    }
    if (type === 'weaning_alert') {
      return { label: 'Ir a Destetar', variant: 'primary' as const };
    }
    if (type === 'birth_warning') {
      return { label: 'Ir a Partos', variant: 'primary' as const };
    }
    return { label: 'Revisar Alerta', variant: 'primary' as const };
  };

  // Helpers de persistencia
  const isPreviewSeenOrDismissed = (id: number, userId: string) => {
    if (typeof window === 'undefined') return false;
    return (
      sessionStorage.getItem(`hoptolt_prev_seen_${userId}_${id}`) === 'true' ||
      localStorage.getItem(`hoptolt_prev_seen_${userId}_${id}`) === 'true' ||
      sessionStorage.getItem(`hoptolt_prev_dismissed_${userId}_${id}`) === 'true' ||
      localStorage.getItem(`hoptolt_prev_dismissed_${userId}_${id}`) === 'true'
    );
  };

  const markPreviewSeen = (id: number, userId: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`hoptolt_prev_seen_${userId}_${id}`, 'true');
      localStorage.setItem(`hoptolt_prev_seen_${userId}_${id}`, 'true');
    }
  };

  const markPreviewDismissed = (id: number, userId: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`hoptolt_prev_dismissed_${userId}_${id}`, 'true');
      localStorage.setItem(`hoptolt_prev_dismissed_${userId}_${id}`, 'true');
    }
  };

  const isInitialMountRef = useRef(true);
  const previousUnreadAlertsCountRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Filtrado de alertas activas
  const alertNotifications = notifications.filter(isWarningNotification);
  const unreadAlerts = alertNotifications.filter(n => !n.read);
  const unreadAlertsCount = unreadCount !== undefined ? unreadCount : unreadAlerts.length;
  const remainingWarningsCount = Math.max(0, unreadAlertsCount - 1);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousUnreadAlertsCountRef.current = unreadAlertsCount;
      return;
    }

    if (unreadAlertsCount > previousUnreadAlertsCountRef.current) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 2500);
    }
    previousUnreadAlertsCountRef.current = unreadAlertsCount;
  }, [unreadAlertsCount]);

  useEffect(() => {
    const handleCloseAlerts = () => {
      setTimeout(() => {
        setIsOpen(false);
      }, 0);
    };
    window.addEventListener('close-alerts', handleCloseAlerts);

    return () => {
      window.removeEventListener('close-alerts', handleCloseAlerts);
    };
  }, []);

  const lastUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.id && lastUserRef.current && lastUserRef.current !== user.id) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`hoptolt_last_feeding_popup_${lastUserRef.current}`);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      activeWarningRef.current = null;
      setActiveWarningPreview(null);
    }
    lastUserRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // Previa Flotante con sonido dedicado de alerta
  useEffect(() => {
    if (isOpen || !previewAlertsEnabled) {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      activeWarningRef.current = null;
      setActiveWarningPreview(null);
      return;
    }
    if (typeof window === 'undefined' || !user?.id) return;

    const now = Date.now();
    const userId = user.id;

    const unreadWarnings = alertNotifications
      .filter(n => !n.read)
      .sort((a, b) => {
        const wA = getWarningWeight(a);
        const wB = getWarningWeight(b);
        if (wA !== wB) return wB - wA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    if (activeWarningRef.current) {
      const stillActive = unreadWarnings.some(n => n.id === activeWarningRef.current.id);
      if (!stillActive) {
        if (warningTimerRef.current) {
          clearTimeout(warningTimerRef.current);
          warningTimerRef.current = null;
        }
        activeWarningRef.current = null;
        setActiveWarningPreview(null);
      }
    }

    if (!activeWarningRef.current) {
      const feedingReminder = unreadWarnings.find(n => n.data?.type === 'feeding_reminder');
      let candidateWarning: any = null;

      if (feedingReminder) {
        const reminderId = feedingReminder.id;
        const shift = feedingReminder.data?.shift || 'default';
        const date = feedingReminder.data?.date || '';
        const storageTimeKey = `hoptolt_last_feeding_popup_${userId}_${shift}_${date}`;
        const lastTimeStr = localStorage.getItem(storageTimeKey);
        const lastTime = lastTimeStr ? Number.parseInt(lastTimeStr, 10) : 0;

        // Si la alerta de este turno específico nunca se ha visto, es NUEVA y debe sonar y mostrarse de inmediato
        const isNeverSeen = !isPreviewSeenOrDismissed(reminderId, userId);

        // Si ya fue vista pero sigue pendiente, re-alertar cada 60 minutos
        const FEEDING_INTERVAL = 60 * 60 * 1000;
        const isIntervalDue = lastTime > 0 && (now - lastTime >= FEEDING_INTERVAL);

        const isDue = isNeverSeen || isIntervalDue;

        if (isDue && !sessionStorage.getItem(`hoptolt_prev_dismissed_${userId}_${reminderId}`)) {
          candidateWarning = feedingReminder;
        }
      }

      if (!candidateWarning) {
        candidateWarning = unreadWarnings.find(n => {
          if (n.data?.type === 'feeding_reminder') return false;
          return !isPreviewSeenOrDismissed(n.id, userId);
        }) || null;
      }

      if (candidateWarning) {
        activeWarningRef.current = candidateWarning;
        setActiveWarningPreview(candidateWarning);
        markPreviewSeen(candidateWarning.id, userId);
        playWarningAlertSound();

        if (candidateWarning.data?.type === 'feeding_reminder') {
          const shift = candidateWarning.data?.shift || 'default';
          const date = candidateWarning.data?.date || '';
          localStorage.setItem(`hoptolt_last_feeding_popup_${userId}_${shift}_${date}`, now.toString());
        }

        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => {
          activeWarningRef.current = null;
          setActiveWarningPreview(null);
          warningTimerRef.current = null;
        }, 14000);
      }
    }
  }, [alertNotifications, isOpen, user?.id, previewAlertsEnabled]);

  useEffect(() => {
    if (activeWarningPreview && !isOpen) {
      const emitState = () => {
        const el = document.getElementById('hoptolt-alert-preview');
        const h = el ? el.getBoundingClientRect().height : 185;
        window.dispatchEvent(new CustomEvent('hoptolt_alert_preview_change', { detail: { active: true, height: h } }));
      };
      emitState();
      const t1 = setTimeout(emitState, 60);
      const t2 = setTimeout(emitState, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        window.dispatchEvent(new CustomEvent('hoptolt_alert_preview_change', { detail: { active: false, height: 0 } }));
      };
    } else {
      window.dispatchEvent(new CustomEvent('hoptolt_alert_preview_change', { detail: { active: false, height: 0 } }));
    }
  }, [activeWarningPreview, isOpen]);

  const handleCloseWarningPreview = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    const currentItem = activeWarningRef.current || activeWarningPreview;
    if (currentItem && user?.id) {
      markPreviewDismissed(currentItem.id, user.id);
    }
    activeWarningRef.current = null;
    setActiveWarningPreview(null);
  };

  const handleNotificationClick = async (notification: any) => {
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
        console.error('Error marking notification as read:', error);
      }
    }
    routeNotification(notification, router);
    setIsOpen(false);
  };

  const sortedAlerts = [...alertNotifications].sort((a, b) => {
    const pA = getWarningWeight(a);
    const pB = getWarningWeight(b);
    if (pA !== pB) return pB - pA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const displayedAlerts = sortedAlerts.slice(0, ALERTS_LIMIT);

  return (
    <div className="relative">
      <button
        type="button"
        title="Alertas operativas"
        onClick={() => {
          handleCloseWarningPreview();
          window.dispatchEvent(new CustomEvent('close-notifications'));
          setIsOpen((prev) => !prev);
          if (window.innerWidth < 1024) {
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
        <AlertTriangle
          className={cn(
            "w-5 h-5 transition-transform origin-center text-muted",
            unreadAlertsCount > 0 && "animate-alert-wiggle text-amber-500"
          )}
        />
        {unreadAlertsCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm pointer-events-none animate-badge-pop"
          >
            {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
          </span>
        )}
      </button>

      {activeWarningPreview && !isOpen && (
        <div
          id="hoptolt-alert-preview"
          className="fixed top-16 right-3 sm:right-6 left-3 sm:left-auto w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] flex flex-col gap-2.5 z-[60] pointer-events-none"
        >
          <div className="pointer-events-auto bg-card rounded-xl shadow-xl border border-amber-300 dark:border-amber-800/70 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-3.5 py-2 border-b border-default flex justify-between items-center bg-amber-500/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-semibold text-main text-xs uppercase tracking-wider">
                  Alerta Importante
                </span>
                {remainingWarningsCount > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-theme-surface text-main border border-default">
                    + {remainingWarningsCount} más
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseWarningPreview}
                className="text-theme-faint hover:text-muted p-1 rounded hover:bg-theme-surface transition-colors cursor-pointer"
                aria-label="Cerrar alerta"
              >
                <X size={15} />
              </button>
            </div>

            <div
              role="button"
              tabIndex={0}
              className="w-full text-left p-4 bg-card hover:bg-theme-surface transition-colors cursor-pointer block focus:outline-none focus:ring-2 focus:ring-amber-500"
              onClick={() => {
                const item = activeWarningPreview;
                handleCloseWarningPreview();
                handleNotificationClick(item);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const item = activeWarningPreview;
                  handleCloseWarningPreview();
                  handleNotificationClick(item);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-main text-sm flex items-center gap-2">
                    {activeWarningPreview.title}
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                  </h4>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {activeWarningPreview.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-default">
                    <p className="text-xs text-theme-faint">{formatTime(activeWarningPreview.createdAt)}</p>
                    <Button
                      size="sm"
                      variant={getActionConfig(activeWarningPreview).variant}
                      onClick={(e) => {
                        e.stopPropagation();
                        const item = activeWarningPreview;
                        handleCloseWarningPreview();
                        handleNotificationClick(item);
                      }}
                      className="text-xs py-1 px-3 shadow-sm h-auto bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {getActionConfig(activeWarningPreview).label}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popover de Alertas */}
      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/20 sm:bg-transparent border-none w-full h-full cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar alertas"
          />
          <div className="fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-card rounded-xl shadow-2xl border border-strong overflow-hidden z-[60] flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[520px]">
            <div className="p-3.5 border-b border-default flex flex-col gap-2.5 bg-theme-surface shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-main text-sm m-0">Alertas del Galpón</h3>
                </div>
              </div>
              <Link
                href="/dashboard/notifications?filter=alerts"
                onClick={() => setIsOpen(false)}
                className="w-full text-center block text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium py-1.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors border-none cursor-pointer"
              >
                Ver todas las alertas
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-default/60 overscroll-contain">
              {displayedAlerts.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-main">Todo al día en el galpón</p>
                  <p className="text-xs text-theme-faint mt-1">No hay alertas operativas pendientes</p>
                </div>
              ) : (
                displayedAlerts.map((notification) => (
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
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 mt-0.5">
                        <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-main text-xs sm:text-sm flex items-center gap-1.5">
                            {notification.title}
                            {!notification.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block shrink-0" />
                            )}
                          </h4>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteNotification(notification.id);
                                showToast('Alerta eliminada', 'success');
                              } catch (error) {
                                console.error(error);
                                showToast('Error al eliminar alerta', 'error');
                              }
                            }}
                            className="text-theme-faint hover:text-muted p-0.5"
                            aria-label="Eliminar alerta"
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {notification.message.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={i} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                        <p className="text-xs text-theme-faint mt-2 font-medium">{formatTime(notification.createdAt)}</p>
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
