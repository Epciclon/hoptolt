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
import {
  extractGrowthSummaryData,
  isWarningNotification,
  sortNotificationsByRecent,
  isPreviewKeySeenOrDismissed,
  markPreviewKeyState,
} from '../utils/growthNotificationUtils';

const getNotificationVersion = (n: any) => {
  const logId = n.data?.lastLogId || n.data?.logId || 0;
  const count = n.data?.changeCount || n.data?.totalCount || n.data?.updatesCount || 1;
  const time = new Date(n.updatedAt || n.createdAt).getTime();
  return `${n.id}_${logId}_${count}_${time}`;
};

const isPreviewSeenOrDismissed = (n: any, userId: string) =>
  isPreviewKeySeenOrDismissed(userId, `${n.id}_${getNotificationVersion(n)}`);

const markPreviewSeen = (n: any, userId: string) =>
  markPreviewKeyState(userId, `${n.id}_${getNotificationVersion(n)}`, 'seen');

const markPreviewDismissed = (n: any, userId: string) =>
  markPreviewKeyState(userId, `${n.id}_${getNotificationVersion(n)}`, 'dismissed');

function selectCandidateInfoNotification(unreadInfos: any[], userId: string, now: number): any {
  const sortedCandidates = sortNotificationsByRecent(unreadInfos);

  return sortedCandidates.find(n => {
    if (isPreviewSeenOrDismissed(n, userId)) return false;

    const isAssignment = n.data?.type === 'task_assignment' || n.title?.toLowerCase().includes('asignaci');
    if (n.type === 'invitation' || isAssignment) return true;

    const notifTime = new Date(n.updatedAt || n.createdAt).getTime();
    const diffMs = Math.abs(now - notifTime);
    return diffMs < (10 * 60 * 1000);
  }) || null;
}

function renderBoldMessageParts(message: string) {
  let offset = 0;
  return message.split(/(\*\*.*?\*\*)/g).map((part: string) => {
    const key = `${part}-${offset}`;
    offset += part.length;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key} className="font-semibold text-main">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function getInfoPreviewHeaderLabel(notification: any): string {
  if (notification.type === 'invitation') return 'Invitación';
  const isAssignment =
    notification.data?.type === 'task_assignment' ||
    notification.title?.toLowerCase().includes('asignaci');
  if (isAssignment) return 'Nueva Asignación';
  return 'Aviso de Actividad';
}

function getInfoActionConfig(notification: any) {
  const type = notification.data?.type;
  const isAssignment = type === 'task_assignment' || notification.title?.toLowerCase().includes('asignaci');
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
}

function getIconByType(type: string) {
  switch (type) {
    case 'info':
      return 'ℹ';
    case 'invitation':
      return '📨';
    default:
      return '•';
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400';
    case 'invitation':
      return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/40 dark:border-purple-900/60 dark:text-purple-400';
    default:
      return 'bg-theme-surface border-strong text-main';
  }
}

interface InfoFloatingPreviewProps {
  notification: any;
  alertOffset: number;
  remainingInfosCount: number;
  accepting: number | null;
  rejecting: number | null;
  onClose: (e?: React.MouseEvent) => void;
  onSelect: (notification: any) => void;
  onAcceptInvitation: (notification: any) => void;
  onRejectInvitation: (notification: any) => void;
}

function InfoFloatingPreview({
  notification,
  alertOffset,
  remainingInfosCount,
  accepting,
  rejecting,
  onClose,
  onSelect,
  onAcceptInvitation,
  onRejectInvitation,
}: Readonly<InfoFloatingPreviewProps>) {
  const actionConfig = getInfoActionConfig(notification);
  const isInvitation = notification.type === 'invitation';
  const growthSummary = extractGrowthSummaryData(notification);
  const displayMessage = growthSummary ? growthSummary.summaryMessage : notification.message;

  return (
    <div
      style={{ top: alertOffset > 0 ? `calc(4rem + ${alertOffset}px)` : '4rem' }}
      className="fixed right-3 sm:right-6 left-3 sm:left-auto w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] flex flex-col gap-2.5 z-[60] pointer-events-none transition-[top] duration-300 ease-out"
    >
      <div className="pointer-events-auto bg-card rounded-xl shadow-xl border border-blue-300 dark:border-blue-800/70 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="px-3.5 py-2 border-b border-default flex justify-between items-center bg-blue-500/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span className="font-semibold text-blue-900 dark:text-blue-300 text-xs uppercase tracking-wider">
              {getInfoPreviewHeaderLabel(notification)}
            </span>
            {remainingInfosCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
                + {remainingInfosCount} más
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-theme-faint hover:text-muted p-1 rounded hover:bg-theme-surface transition-colors cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X size={15} />
          </button>
        </div>

        <div className="relative w-full text-left p-4 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-theme-surface transition-colors block">
          {!isInvitation && (
            <button
              type="button"
              onClick={() => onSelect(notification)}
              aria-label={`Abrir notificación ${notification.title}`}
              className="absolute inset-0 w-full h-full z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <div className="relative z-10 pointer-events-none flex items-start gap-3">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0', getTypeColor(notification.type))}>
              {getIconByType(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-main text-sm flex items-center gap-2">
                {notification.title}
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              </h4>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {renderBoldMessageParts(displayMessage)}
              </p>

              {(growthSummary?.items.length ?? 0) > 0 && growthSummary && (
                <div className="mt-2.5 p-2 bg-theme-surface rounded-lg border border-default text-xs pointer-events-auto">
                  <p className="text-[11px] text-main font-medium mb-1">
                    Conejos con actualización de edad y peso • {growthSummary.items.length}
                  </p>
                  <ul className="divide-y divide-default bg-card rounded border border-default max-h-28 overflow-y-auto">
                    {growthSummary.items.map((item) => (
                      <li key={item.key} className="flex flex-wrap items-center justify-between py-1 px-2.5 gap-1.5">
                        <span className="font-medium text-main break-words">{item.name}</span>
                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                          <span className="text-[10px] font-medium text-main bg-theme-surface px-2 py-0.5 rounded border border-default">
                            {item.ageBadge}
                          </span>
                          {item.weightBadge && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {item.weightBadge}
                            </span>
                          )}
                          {item.isMature && (
                            <span className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Madurez
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(notification.data?.workersList?.length ?? 0) > 1 && (
                <div className="mt-2 p-1.5 bg-card/70 rounded border border-default text-xs flex flex-wrap gap-x-3 gap-y-1">
                  {notification.data.workersList.map((w: any) => (
                    <span key={w.name} className="inline-flex items-center gap-1">
                      <span className="font-medium text-main">{w.name}:</span>
                      <span className="font-semibold text-main">{w.count}</span>
                    </span>
                  ))}
                </div>
              )}

              {notification.data?.type === 'worker_sensitive_action' && (notification.data?.modulesBreakdown?.length ?? 0) > 0 && (
                <div className="mt-2.5 p-2 bg-theme-surface rounded-lg border border-default text-xs pointer-events-auto">
                  <ul className="divide-y divide-default bg-card rounded border border-default max-h-28 overflow-y-auto">
                    {notification.data.modulesBreakdown.map((m: any) => (
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
                <p className="text-xs text-theme-faint">{formatTime(notification.updatedAt || notification.createdAt)}</p>

                <div className="pointer-events-auto">
                  {isInvitation ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectInvitation(notification);
                        }}
                        disabled={accepting === notification.id || rejecting === notification.id}
                        className="text-xs py-1 px-2.5 h-auto shadow-sm"
                      >
                        {rejecting === notification.id ? 'Rechazando...' : 'Rechazar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcceptInvitation(notification);
                        }}
                        disabled={accepting === notification.id || rejecting === notification.id}
                        className="text-xs py-1 px-2.5 h-auto shadow-sm"
                      >
                        {accepting === notification.id ? 'Aceptando...' : 'Aceptar'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant={actionConfig.variant}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(notification);
                      }}
                      className="text-xs py-1 px-3 shadow-sm h-auto"
                    >
                      {actionConfig.label}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NotificationPopoverItemProps {
  notification: any;
  accepting: number | null;
  rejecting: number | null;
  onSelect: (notification: any) => void;
  onDelete: (id: number) => Promise<void>;
  onAcceptInvitation: (notification: any) => void;
  onRejectInvitation: (notification: any) => void;
}

function NotificationPopoverItem({
  notification,
  accepting,
  rejecting,
  onSelect,
  onDelete,
  onAcceptInvitation,
  onRejectInvitation,
}: Readonly<NotificationPopoverItemProps>) {
  const growthSummary = extractGrowthSummaryData(notification);
  const displayMessage = growthSummary ? growthSummary.summaryMessage : notification.message;

  return (
    <div
      className={cn(
        'relative w-full text-left p-3.5 hover:bg-theme-surface transition-colors block',
        !notification.read && 'bg-primary-50/40 dark:bg-primary-900/15'
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(notification)}
        aria-label={`Abrir notificación ${notification.title}`}
        className="absolute inset-0 w-full h-full z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="relative z-10 pointer-events-none flex items-start gap-3">
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
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(notification.id);
                }}
                className="pointer-events-auto text-theme-faint hover:text-muted p-0.5"
                aria-label="Eliminar notificación"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {renderBoldMessageParts(displayMessage)}
          </p>
          <p className="text-xs text-theme-faint mt-2 font-medium">{formatTime(notification.updatedAt || notification.createdAt)}</p>

          {notification.type === 'invitation' && (
            <div className="pointer-events-auto flex gap-2 mt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptInvitation(notification);
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
                  onRejectInvitation(notification);
                }}
                disabled={accepting === notification.id || rejecting === notification.id}
                className="text-xs py-1 px-3"
              >
                {rejecting === notification.id ? 'Rechazando...' : 'Rechazar'}
              </Button>
            </div>
          )}

          {(growthSummary?.items.length ?? 0) > 0 && growthSummary && (
            <div className="pointer-events-auto mt-2 flex flex-col gap-1 p-2 rounded-md bg-theme-surface border border-default">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-main font-medium">
                  Conejos con actualización de edad y peso • {growthSummary.items.length}
                </span>
              </div>
              <ul className="text-[11px] text-main max-h-28 overflow-y-auto bg-card rounded p-1 border border-default divide-y divide-default">
                {growthSummary.items.map((item) => (
                  <li key={item.key} className="flex flex-wrap items-center justify-between py-1 px-1.5 gap-1.5">
                    <span className="font-medium text-main break-words">{item.name}</span>
                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                      <span className="text-[10px] font-medium text-main bg-theme-surface px-1.5 py-0.5 rounded border border-default">
                        {item.ageBadge}
                      </span>
                      {item.weightBadge && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          {item.weightBadge}
                        </span>
                      )}
                      {item.isMature && (
                        <span className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Madurez
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notification.data?.type === 'worker_action' && (notification.data?.workersList?.length ?? 0) > 1 && (
            <div className="pointer-events-auto mt-2 flex flex-col gap-1 p-2 rounded-md bg-theme-surface border border-default">
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

          {notification.data?.type === 'worker_sensitive_action' && (notification.data?.modulesBreakdown?.length ?? 0) > 0 && (
            <div className="pointer-events-auto mt-2 flex flex-col gap-1 p-2 rounded-md bg-theme-surface border border-default">
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
  );
}

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

  const clearActiveInfoTimerAndPreview = () => {
    if (infoTimerRef.current) {
      clearTimeout(infoTimerRef.current);
      infoTimerRef.current = null;
    }
    activeInfoRef.current = null;
    setActiveInfoPreview(null);
  };

  const activateInfoPreviewWithTimer = (candidate: any, userId: string) => {
    activeInfoRef.current = candidate;
    setActiveInfoPreview(candidate);
    markPreviewSeen(candidate, userId);
    playNotificationSound();

    if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    infoTimerRef.current = setTimeout(() => {
      activeInfoRef.current = null;
      setActiveInfoPreview(null);
      infoTimerRef.current = null;
    }, 14000);
  };

  useEffect(() => {
    const syncSetting = () => {
      const enabled = typeof window !== 'undefined' ? localStorage.getItem('hoptolt_preview_notifications') !== 'false' : true;
      setPreviewNotificationsEnabled(enabled);
      if (!enabled) {
        clearActiveInfoTimerAndPreview();
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

    const el = document.getElementById('hoptolt-alert-preview');
    if (el) {
      setAlertOffset(el.getBoundingClientRect().height + 12);
    }

    return () => {
      window.removeEventListener('hoptolt_alert_preview_change', handleAlertChange);
    };
  }, []);

  // Filtrado exclusivo de avisos generales y actividades
  const infoNotifications = notifications.filter(n => !isWarningNotification(n));
  const unreadInfos = infoNotifications.filter(n => !n.read);
  const unreadInfosCount = unreadCount !== undefined ? unreadCount : unreadInfos.length;
  const remainingInfosCount = Math.max(0, unreadInfosCount - 1);

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
      clearActiveInfoTimerAndPreview();
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
      clearActiveInfoTimerAndPreview();
      return;
    }
    if (typeof window === 'undefined' || !user?.id) return;

    const now = Date.now();
    const userId = user.id;

    if (activeInfoRef.current) {
      const currentActive = unreadInfos.find(n => n.id === activeInfoRef.current.id);
      if (!currentActive) {
        clearActiveInfoTimerAndPreview();
      } else if (getNotificationVersion(currentActive) !== getNotificationVersion(activeInfoRef.current)) {
        activateInfoPreviewWithTimer(currentActive, userId);
      }
    }

    if (!activeInfoRef.current) {
      const candidateInfo = selectCandidateInfoNotification(unreadInfos, userId, now);
      if (candidateInfo) {
        activateInfoPreviewWithTimer(candidateInfo, userId);
      }
    }
  }, [unreadInfos, isOpen, user?.id, previewNotificationsEnabled]);

  const handleCloseInfoPreview = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentItem = activeInfoRef.current || activeInfoPreview;
    if (currentItem && user?.id) {
      markPreviewDismissed(currentItem, user.id);
    }
    clearActiveInfoTimerAndPreview();
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

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      showToast('Notificación eliminada', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar notificación', 'error');
    }
  };

  const sortedNotifications = [...infoNotifications].sort((a, b) => {
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
        <InfoFloatingPreview
          notification={activeInfoPreview}
          alertOffset={alertOffset}
          remainingInfosCount={remainingInfosCount}
          accepting={accepting}
          rejecting={rejecting}
          onClose={handleCloseInfoPreview}
          onSelect={(item) => {
            handleCloseInfoPreview();
            void handleNotificationClick(item);
          }}
          onAcceptInvitation={(item) => { void handleAcceptInvitation(item); }}
          onRejectInvitation={(item) => { void handleRejectInvitation(item); }}
        />
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
                    onClick={() => { void markAllAsRead(); }}
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
                  <NotificationPopoverItem
                    key={notification.id}
                    notification={notification}
                    accepting={accepting}
                    rejecting={rejecting}
                    onSelect={(item) => { void handleNotificationClick(item); }}
                    onDelete={handleDeleteNotification}
                    onAcceptInvitation={(item) => { void handleAcceptInvitation(item); }}
                    onRejectInvitation={(item) => { void handleRejectInvitation(item); }}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
