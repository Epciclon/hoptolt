'use client';

import { useState, useEffect } from 'react';
import { Dialog, Button } from '@/shared/ui';
import { Mail, AtSign, Shield, Box, Pencil, Trash2 } from 'lucide-react';

// English-to-Spanish module name mapping for display
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  feeding: 'Alimentación',
  vaccination: 'Vacunación',
  deworming: 'Desparasitación',
  cleaning: 'Limpieza',
  mortality: 'Mortalidad',
  reproduction: 'Reproducción y Parto',
  reports: 'Reportes',
  cages: 'Jaulas',
  races: 'Razas',
  rabbits: 'Conejos',
  assignments: 'Asignar',
  genealogy: 'Genealogía',
  farmMembers: 'Usuarios',
  galpones: 'Galpones',
};

interface WorkerProfile {
  fullName?: string;
  email?: string;
  username?: string;
}

interface WorkerPermission {
  id?: number;
  moduleName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface WorkerCage {
  id?: number;
  cageId?: number;
  cage?: { number: number; type?: string };
}

export interface WorkerDetailsData {
  id: number;
  role?: string;
  profile?: WorkerProfile;
  permissions?: WorkerPermission[];
  assignedCages?: WorkerCage[];
  [key: string]: unknown;
}

export interface WorkerDetailsModalProps {
  open: boolean;
  onClose: () => void;
  worker: WorkerDetailsData | null;
  /** Callback to fetch full worker data by ID */
  fetchWorkerById: (id: number) => Promise<WorkerDetailsData>;
  onEdit: (worker: WorkerDetailsData) => void;
  onDelete: (worker: WorkerDetailsData) => void;
}

export function WorkerDetailsModal({
  open,
  onClose,
  worker,
  fetchWorkerById,
  onEdit,
  onDelete,
}: WorkerDetailsModalProps) {
  const [fullWorker, setFullWorker] = useState<WorkerDetailsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && worker) {
      setLoading(true);
      fetchWorkerById(worker.id)
        .then(data => setFullWorker(data))
        .catch(() => setFullWorker(worker))
        .finally(() => setLoading(false));
    } else {
      setFullWorker(null);
    }
  }, [open, worker]);

  if (!worker) return null;

  const profile = fullWorker?.profile || worker.profile;
  const permissions: WorkerPermission[] = (fullWorker?.permissions || []) as WorkerPermission[];
  const assignedCages: WorkerCage[] = (fullWorker?.assignedCages || []) as WorkerCage[];

  const initials = (profile?.fullName || 'U')
    .split(' ')
    .map((s: string) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const activePermissions = permissions.filter(
    (perm) => perm.canCreate || perm.canRead || perm.canUpdate || perm.canDelete
  );

  return (
    <Dialog open={open} onClose={onClose} title="Detalles del Trabajador" size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header — Avatar + Name */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 truncate">{profile?.fullName || '—'}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Mail size={14} /> {profile?.email || '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <AtSign size={14} /> {profile?.username || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Jaulas Asignadas — FIRST */}
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
              <Box size={15} className="text-slate-500" />
              Jaulas Asignadas ({assignedCages.length})
            </h4>
            {assignedCages.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-lg py-4 text-center border border-slate-100">
                No tiene jaulas asignadas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedCages.map((wc) => (
                  <span
                    key={wc.id ?? wc.cageId}
                    className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200"
                  >
                    <Box size={13} className="text-slate-500" />
                    Jaula #{wc.cage?.number ?? wc.cageId}
                    {wc.cage?.type && (
                      <span className="text-xs text-slate-400 ml-0.5">({wc.cage.type})</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Permisos — SECOND */}
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
              <Shield size={15} className="text-slate-500" />
              Permisos ({activePermissions.length})
            </h4>
            {activePermissions.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-lg py-4 text-center border border-slate-100">
                Este trabajador no tiene permisos asignados.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activePermissions.map((perm) => {
                  const actions: string[] = [];
                  if (perm.canCreate) actions.push('Crear');
                  if (perm.canRead) actions.push('Consultar');
                  if (perm.canUpdate) actions.push('Editar');
                  if (perm.canDelete) actions.push('Eliminar');

                  return (
                    <div
                      key={perm.id ?? perm.moduleName}
                      className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col gap-2"
                    >
                      <span className="font-semibold text-slate-700 text-sm">
                        {MODULE_DISPLAY_NAMES[perm.moduleName] || perm.moduleName}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map((act) => (
                          <span
                            key={act}
                            className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              icon={<Pencil size={14} />}
              onClick={() => { onClose(); onEdit(fullWorker || worker); }}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => { onClose(); onDelete(fullWorker || worker); }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
