'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, MessageSquare, User, Calendar, Trash2 } from 'lucide-react';
import { Button, Badge, ConfirmDialog, Dialog } from '@/shared/ui';
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

type FormStatus = 'pending' | 'draft' | 'reviewed';

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
  const [selectedStatus, setSelectedStatus] = useState<FormStatus>(
    incident?.status === 'pending' ? 'pending' : 'draft'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingResponse, setIsEditingResponse] = useState(false);

  useEffect(() => {
    if (incident) {
      setOwnerResponse(incident.ownerResponse || '');
      setSelectedStatus(incident.status === 'pending' ? 'pending' : 'draft');
      setError(null);
      setIsEditingResponse(false);
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

  if (!isOpen || !incident) return null;

  return (
    <>
      <Dialog
        open={isOpen && Boolean(incident)}
        onClose={onClose}
        title={incident?.title || 'Detalle de la Novedad'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Header info badge row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs font-semibold text-primary-600 dark:text-primary-400">
              {incident.category}
            </span>
            {!(userRole === 'owner' && (incident.status === 'pending' || isEditingResponse)) && getStatusBadge(incident.status)}
            {getModuleLabel(incident.module) && (
              <span className="px-2.5 py-1 rounded-lg bg-theme-surface border border-default text-xs font-medium text-main">
                Labor: {getModuleLabel(incident.module)}
              </span>
            )}
          </div>

          {/* Metadata badges: reporter & date */}
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

          {/* Cages indicator if provided */}
          {((incident.cages && incident.cages.length > 0) || incident.cage) && (() => {
            const cagesToShow = (incident.cages && incident.cages.length > 0)
              ? incident.cages
              : (Array.isArray(incident.cage) ? incident.cage : [incident.cage]);
            return (
              <div className="p-3 rounded-xl bg-theme-surface border border-default flex items-center gap-2 text-xs">
                <span className="text-muted font-medium min-w-12">
                  {cagesToShow.length > 1 ? 'Jaulas afectadas:' : 'Jaula afectada:'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {cagesToShow.map((c: any) => (
                    <span
                      key={c.id || c.number}
                      className="min-w-[2rem] h-6 px-2 rounded-md bg-card border border-strong text-main font-bold text-xs flex items-center justify-center shadow-xs"
                    >
                      {c.number}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-muted mb-1.5">
              Explicación de lo Sucedido
            </h4>
            <div className="p-3.5 rounded-xl bg-theme-surface border border-strong text-xs sm:text-sm text-main whitespace-pre-wrap leading-relaxed">
              {incident.description}
            </div>
          </div>

          {/* Owner Response Section (if exists) */}
          {incident.ownerResponse ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Respuesta del Propietario
                </span>
                {incident.reviewedAt && (
                  <span className="font-normal opacity-80 shrink-0 whitespace-nowrap">
                    {formatFriendlyDate(incident.reviewedAt)}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-main whitespace-pre-wrap leading-relaxed">
                {incident.ownerResponse}
              </p>
              {incident.reviewer && (
                <p className="text-xs text-muted pt-1 border-t border-emerald-500/20">
                  Atendido por {incident.reviewer.fullName || incident.reviewer.username}
                </p>
              )}
            </div>
          ) : userRole === 'worker' ? (
            <div className="p-3.5 rounded-xl bg-theme-surface border border-default text-xs text-muted flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-muted" />
              <span>Esta novedad aún se encuentra pendiente de revisión por el propietario del galpón.</span>
            </div>
          ) : null}

          {/* Owner response form: solo se muestra si está pendiente o si el propietario elige editar */}
          {userRole === 'owner' && (incident.status === 'pending' || isEditingResponse) && (
            <form onSubmit={handleRespond} className="space-y-3 pt-3 border-t border-default">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-main flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-primary-500" />
                  <span>Respuesta al Trabajador</span>
                </h4>
                {isEditingResponse && (
                  <button
                    type="button"
                    onClick={() => setIsEditingResponse(false)}
                    className="text-xs text-muted hover:text-main cursor-pointer"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

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
                    setSelectedStatus('draft');
                  } else {
                    setSelectedStatus('pending');
                  }
                }}
                placeholder="Escribe las instrucciones, confirmación o resolución para el trabajador..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
              />

              {selectedStatus === 'pending' && (
                <div className="p-2.5 rounded-xl bg-theme-surface border border-default text-xs text-muted">
                  Al guardar en estado pendiente se descartará la respuesta previa y la novedad volverá a requerir atención.
                </div>
              )}

              {/* Controles de estado y botón de envío responsivos sin desbordar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted font-medium">Estado:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value as FormStatus;
                      setSelectedStatus(nextStatus);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-theme-surface border border-strong rounded-lg text-main focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="draft">Borrador</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isResponding}
                  className="w-full sm:w-auto"
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

          {/* Acciones inferiores del modal */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-default mt-4">
            {userRole !== 'owner' && incident.status === 'pending' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="w-full sm:w-auto text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar Novedad'}</span>
              </Button>
            ) : userRole === 'owner' && incident.ownerResponse && !isEditingResponse ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingResponse(true);
                  setSelectedStatus('draft');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={14} className="text-primary-500" />
                <span>Editar Respuesta</span>
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Dialog>

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
    </>
  );
}
