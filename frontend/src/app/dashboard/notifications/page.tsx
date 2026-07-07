'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import { useInvitation } from '@/modules/invitation/hooks/useInvitation';
import { notificationService } from '@/modules/notification/services/notification.service';
import { growthService } from '@/modules/growth/services/growth.service';
import { useToast } from '@/shared/contexts/ToastContext';
import { Bell, CheckCheck, Clock, Settings2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/modules/notification/types/notification.types';
import { useNotifications } from '@/modules/notification/hooks/useNotification';

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [filter, setFilter] = useState<string>('all');
  const [processing, setProcessing] = useState<number | null>(null);
  const { showToast } = useToast();
  const router = useRouter();
  const { acceptInvitation, revokeInvitation } = useInvitation();
  const [accepting, setAccepting] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [selectedRabbitForNotification, setSelectedRabbitForNotification] = useState<Record<number, number | null>>({});
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      showToast('Notificaciones marcadas como leídas', 'success');
    } catch (error) {
      showToast('Error al marcar notificaciones', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      showToast('Notificación eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar notificación', 'error');
    }
  };

  const handleRespondToWeight = async (notification: Notification, action: 'accept' | 'reject' | 'revert') => {
    setProcessing(notification.id);
    try {
      await growthService.respondToEstimation(notification.id, action);
      showToast(
        action === 'accept' ? 'Peso actualizado correctamente' : 
        action === 'revert' ? 'Estimación revertida a pendiente' : 'Estimación rechazada', 
        'success'
      );
      await fetchNotifications(); // Recargar para obtener el estado JSON actualizado
    } catch (error) {
      showToast('Error al procesar la estimación de peso', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleRespondToWeightGrouped = async (notificationId: number, rabbitId: number, action: 'accept' | 'reject' | 'revert') => {
    setProcessing(notificationId);
    try {
      await growthService.respondToEstimation(notificationId, action, rabbitId);
      showToast(
        action === 'accept' ? 'Peso actualizado correctamente' : 
        action === 'revert' ? 'Estimación revertida a pendiente' : 'Estimación rechazada', 
        'success'
      );
      await fetchNotifications(); // Recargar para obtener el estado actualizado
    } catch (error) {
      showToast('Error al procesar la estimación de peso', 'error');
    } finally {
      setProcessing(null);
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
      }
    } catch (error) {
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
    
    if (notification.data?.type === 'birth_warning' && notification.data?.estimatedBirthDate) {
      router.push(`/dashboard?date=${notification.data.estimatedBirthDate}&reproductionId=${notification.data.reproductionId}`);
    } else if (notification.data?.type === 'cleaning_warning') {
      router.push('/dashboard/cleaning');
    } else if (notification.data?.galponId && (notification.type === 'success' || notification.type === 'invitation')) {
      router.push('/dashboard/galpones');
    }
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      case 'invitation': return '📨';
      default: return '•';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'invitation': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-slate-50 border-slate-200 text-slate-800';
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
    if (filter === 'growth') return n.data?.type === 'weight_estimation' || n.data?.type === 'weight_estimations' || n.data?.type === 'age_update';
    if (filter === 'birth') return n.data?.type === 'birth_warning';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centro de Notificaciones</h1>
          <p className="text-slate-500 mt-1">Gestiona todas las alertas y actualizaciones del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleMarkAllRead} className="flex items-center gap-2">
            <CheckCheck size={18} />
            Marcar todas como leídas
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50" padding="none">
        <div className="p-4 border-b border-slate-100 flex gap-2 overflow-x-auto">
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
            variant={filter === 'birth' ? 'primary' : 'outline'} 
            onClick={() => setFilter('birth')}
            className="rounded-full px-6"
          >
            Partos
          </Button>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p>Cargando notificaciones...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700">No hay notificaciones</h3>
              <p className="mt-1">No tienes alertas pendientes en esta categoría.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors group cursor-pointer",
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
                        <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                          {notification.title}
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                          )}
                        </h4>
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap">{notification.message}</p>
                      </div>
                      <div className="text-sm text-slate-400 flex flex-col items-end gap-2 shrink-0">
                        <span>{formatTime(notification.createdAt)}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-2"
                          title="Eliminar notificación"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Acciones específicas por tipo */}
                    {notification.data?.type === 'weight_estimation' && (
                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {notification.data.status === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => handleRespondToWeight(notification, 'accept')}
                              disabled={processing === notification.id}
                            >
                              {processing === notification.id ? 'Procesando...' : 'Aceptar Cambio'}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleRespondToWeight(notification, 'reject')}
                              disabled={processing === notification.id}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                        
                        {notification.data.status === 'rejected' && (
                          <Button
                            variant="warning"
                            onClick={() => handleRespondToWeight(notification, 'revert')}
                            disabled={processing === notification.id}
                          >
                            {processing === notification.id ? 'Revertiendo...' : 'Revertir Decisión'}
                          </Button>
                        )}
                        
                        {notification.data.status === 'accepted' && (
                          <span className="text-green-600 font-bold text-sm flex items-center gap-1">
                            ✓ Guardado
                          </span>
                        )}
                      </div>
                    )}

                    {notification.data?.type === 'weight_estimations' && (
                      <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Conejos con estimaciones de peso (Haz clic en un conejo para actuar):
                        </div>
                        <div className="flex flex-col gap-2">
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
                                  "p-3 rounded-lg border transition-colors flex items-center justify-between",
                                  isSelected ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100",
                                  (rabbit.status === 'pending' || rabbit.status === 'rejected') && "cursor-pointer"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-700">{rabbit.rabbitCode}</span>
                                  {rabbit.rabbitName && <span className="text-slate-500 text-sm">({rabbit.rabbitName})</span>}
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                    Jaula {rabbit.cageNumber}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                  {isSelected && rabbit.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleRespondToWeightGrouped(notification.id, rabbit.rabbitId, 'accept')}
                                        disabled={processing === notification.id}
                                      >
                                        Aceptar Cambio
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => handleRespondToWeightGrouped(notification.id, rabbit.rabbitId, 'reject')}
                                        disabled={processing === notification.id}
                                      >
                                        Rechazar
                                      </Button>
                                    </div>
                                  )}

                                  {isSelected && rabbit.status === 'rejected' && (
                                    <Button
                                      size="sm"
                                      variant="warning"
                                      onClick={() => handleRespondToWeightGrouped(notification.id, rabbit.rabbitId, 'revert')}
                                      disabled={processing === notification.id}
                                    >
                                      Revertir Decisión
                                    </Button>
                                  )}

                                  {(!isSelected || rabbit.status === 'accepted') && (
                                    <div className="text-xs flex items-center gap-2.5 font-medium">
                                      <span className="text-slate-400">Actual: {rabbit.currentWeight} kg</span>
                                      <span className="text-slate-500">→ Estimado: {rabbit.estimatedWeight} kg</span>
                                      {rabbit.status === 'accepted' && (
                                        <span className="text-green-600 font-semibold flex items-center gap-1">
                                          ✓ Guardado
                                        </span>
                                      )}
                                      {rabbit.status === 'rejected' && (
                                        <span className="text-red-600 font-semibold flex items-center gap-1">
                                          ✕ Rechazado (Clic para revertir)
                                        </span>
                                      )}
                                      {rabbit.status === 'pending' && (
                                        <span className="text-blue-600 font-semibold">
                                          • Pendiente (Clic para actuar)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {notification.type === 'invitation' && (
                      <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <p className="text-sm font-medium text-slate-700">Invitación a unirse a un galpón</p>
                          <p className="text-xs text-slate-500 mt-1">Galpón: {notification.data?.galponName || 'Galpón'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAcceptInvitation(notification)}
                            disabled={accepting === notification.id || rejecting === notification.id}
                          >
                            {accepting === notification.id ? 'Aceptando...' : 'Aceptar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRejectInvitation(notification)}
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
          )}
        </div>
      </Card>
    </div>
  );
}
