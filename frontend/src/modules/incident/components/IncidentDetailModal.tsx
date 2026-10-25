'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, MessageSquare, User, Calendar, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import { Button, Badge, ConfirmDialog } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Incident, IncidentStatus } from '../types/incident.types';
import { useIncidents } from '../hooks/useIncidents';
import { formatFriendlyDate } from '@/shared/utils/dateUtils';

interface IncidentDetailModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'owner' | 'worker';
}

const getModuleLabel = (mod?: string | null) => {
  if (!mod) return null;
  switch (mod.toLowerCase()) {
    case 'alimentacion': return 'Alimentación';
    case 'limpieza': return 'Limpieza';
    case 'vacunacion': return 'Vacunación';
    case 'desparasitacion': return 'Desparasitación';
    case 'reproduccion': return 'Reproducción';
    case 'mortalidad': return 'Mortalidad';
    case 'general': return 'En General';
    default: return mod;
  }
};

export function IncidentDetailModal({
  incident,
  isOpen,
  onClose,
  userRole
}: Readonly<IncidentDetailModalProps>) {
  const { showToast } = useToast();
  const { respondToIncident, isResponding, deleteIncident, isDeleting } = useIncidents();
  const [ownerResponse, setOwnerResponse] = useState(incident?.ownerResponse || '');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(
    incident?.status === 'pending' ? 'pending' : 'reviewed'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (incident) {
      setOwnerResponse(incident.ownerResponse || '');
      setSelectedStatus(incident.status === 'pending' ? 'pending' : 'reviewed');
      setError(null);
    }
  }, [incident, isOpen]);

  // Si el trabajador elimina la novedad mientras el propietario tiene el modal abierto, cerrar automáticamente
  useEffect(() => {
    if (!isOpen || !incident?.id) return;

    const handleIncidentDeleted = (e: any) => {
      const deletedId = e.detail?.incidentId;
      if (deletedId && incident.id === deletedId) {
        showToast('Esta novedad fue eliminada por el trabajador.', 'info');
        onClose();
      }
    };

    window.addEventListener('incident-deleted', handleIncidentDeleted);
    return () => window.removeEventListener('incident-deleted', handleIncidentDeleted);
  }, [isOpen, incident?.id, onClose, showToast]);

  if (!isOpen || !incident) return null;

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedStatus === 'pending') {
      try {
        await respondToIncident({
          id: incident.id,
          dto: {
            ownerResponse: '',
            status: 'pending'
          }
        });
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Error al actualizar el estado.');
      }
      return;
    }

    if (!ownerResponse.trim()) {
      setError('Por favor escribe la respuesta o instrucciones para el trabajador.');
      return;
    }

    try {
      await respondToIncident({
        id: incident.id,
        dto: {
          ownerResponse: ownerResponse.trim(),
          status: 'reviewed'
        }
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la respuesta.');
    }
  };

  const formattedDate = formatFriendlyDate(incident.createdAt);

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'resolved':
      case 'reviewed':
        return <Badge variant="success">Atendida</Badge>;
      default:
        return <Badge variant="warning">Pendiente</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card border border-strong rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default bg-theme-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  {incident.category}
                </span>
                {getStatusBadge(incident.status)}
              </div>
              <h3 className="text-base font-bold text-main line-clamp-1">{incident.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-main p-1.5 rounded-lg hover:bg-theme-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted p-3 rounded-xl bg-theme-surface border border-default">
            {userRole === 'owner' ? (
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-primary-500" />
                <span>Reportado por:</span>
                <strong className="text-main font-semibold">
                  {incident.reporter?.fullName || incident.reporter?.username || 'Trabajador'}
                </strong>
              </div>
            ) : (
              <span className="font-medium text-main">Detalle de tu reporte</span>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar size={14} className="text-primary-500" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Module and cage indicators if provided */}
          {(incident.module || (incident.cages && incident.cages.length > 0) || incident.cage) && (
            <div className="p-3.5 rounded-xl bg-theme-surface border border-default flex flex-col gap-2.5 text-xs">
              {getModuleLabel(incident.module) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted font-medium min-w-12">Labor:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold">
                    {getModuleLabel(incident.module)}
                  </span>
                </div>
              )}

              {((incident.cages && incident.cages.length > 0) || incident.cage) && (() => {
                const cagesToShow = (incident.cages && incident.cages.length > 0)
                  ? incident.cages
                  : (Array.isArray(incident.cage) ? incident.cage : [incident.cage]);
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-muted font-medium min-w-12">
                      {cagesToShow.length > 1 ? 'Jaulas:' : 'Jaula:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {cagesToShow.map((c: any) => (
                        <span
                          key={c.id || c.number}
                          className="min-w-[2rem] h-7 px-2.5 rounded-md bg-card border border-strong text-main font-bold text-xs flex items-center justify-center shadow-xs"
                        >
                          {c.number}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Explicación de lo Sucedido
            </h4>
            <div className="p-4 rounded-xl bg-theme-surface border border-strong text-sm text-main whitespace-pre-wrap leading-relaxed">
              {incident.description}
            </div>
          </div>

          {/* Owner Response Section */}
          {incident.ownerResponse ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  Respuesta del Propietario
                </span>
                {incident.reviewedAt && (
                  <span className="font-normal opacity-80">
                    {formatFriendlyDate(incident.reviewedAt)}
                  </span>
                )}
              </div>
              <p className="text-sm text-main whitespace-pre-wrap leading-relaxed">
                {incident.ownerResponse}
              </p>
              {incident.reviewer && (
                <p className="text-xs text-muted mt-1">
                  Atendido por {incident.reviewer.fullName || incident.reviewer.username}
                </p>
              )}
            </div>
          ) : userRole === 'worker' ? (
            <div className="p-4 rounded-xl bg-theme-surface border border-default text-xs text-muted flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-muted" />
              <span>Esta novedad aún se encuentra pendiente de revisión por el propietario del galpón.</span>
            </div>
          ) : null}

          {/* Owner response form (if Owner) */}
          {userRole === 'owner' && (
            <form onSubmit={handleRespond} className="space-y-3 pt-3 border-t border-default">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-main flex items-center gap-1.5">
                <MessageSquare size={14} className="text-primary-500" />
                <span>Respuesta al Trabajador</span>
              </h4>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  {error}
                </div>
              )}

              <textarea
                rows={3}
                value={ownerResponse}
                onChange={(e) => {
                  const val = e.target.value;
                  setOwnerResponse(val);
                  if (val.trim()) {
                    setSelectedStatus('reviewed');
                  } else {
                    setSelectedStatus('pending');
                  }
                }}
                placeholder="Escribe las instrucciones, confirmación o resolución para el trabajador..."
                className="w-full px-3 py-2 text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
              />

              {selectedStatus === 'pending' && (
                <div className="p-3 rounded-xl bg-theme-surface border border-default text-xs text-muted">
                  Al guardar en estado pendiente se descartará la respuesta previa y la novedad volverá a requerir atención.
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted font-medium">Estado:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value as IncidentStatus;
                      setSelectedStatus(nextStatus);
                    }}
                    className="px-2.5 py-1 text-xs bg-theme-surface border border-strong rounded-lg text-main focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="reviewed">Atendida</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isResponding}
                >
                  {isResponding
                    ? 'Guardando...'
                    : selectedStatus === 'pending'
                      ? 'Guardar como Pendiente'
                      : 'Guardar Respuesta'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-default bg-theme-surface/50 flex items-center justify-between">
          {userRole !== 'owner' && incident.status === 'pending' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/30 flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>{isDeleting ? 'Eliminando...' : 'Eliminar Novedad'}</span>
            </Button>
          ) : (
            <div />
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          const id = incident.id;
          setShowDeleteConfirm(false);
          onClose();
          await deleteIncident(id);
        }}
        title="Eliminar Novedad"
        description="¿Estás seguro de que deseas eliminar esta novedad reportada? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
