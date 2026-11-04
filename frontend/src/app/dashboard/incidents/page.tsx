'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useIncidents } from '@/modules/incident/hooks/useIncidents';
import { IncidentFormModal } from '@/modules/incident/components/IncidentFormModal';
import { IncidentDetailModal } from '@/modules/incident/components/IncidentDetailModal';
import type { Incident } from '@/modules/incident/types/incident.types';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { Card, Button, Pagination, ConfirmDialog, Select } from '@/shared/ui';
import type { FilterConfig } from '@/shared/ui/FilterBar';
import { cn } from '@/lib/utils';
import { formatFriendlyDate } from '@/shared/utils/dateUtils';

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

export default function IncidentsPage() {
  const { user, loading: authLoading } = useAuthContext();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<number | null>(null);

  const {
    incidents,
    pagination,
    counts,
    userRole,
    loading,
    refetch,
    markAsRead,
    deleteIncident,
    isDeleting
  } = useIncidents({
    page,
    limit: 10,
    status: status === 'all' ? undefined : status,
    category: category === 'all' ? undefined : category,
    module: moduleFilter === 'all' ? undefined : moduleFilter,
    search: search.trim() || undefined
  });

  const handleOpenDetail = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailOpen(true);
    markAsRead(incident.id);
  };

  useEffect(() => {
    const handleIncidentDeleted = (e: any) => {
      const deletedId = e.detail?.incidentId;
      if (deletedId && selectedIncident?.id === deletedId) {
        setIsDetailOpen(false);
        setSelectedIncident(null);
      }
    };
    window.addEventListener('incident-deleted', handleIncidentDeleted);
    return () => window.removeEventListener('incident-deleted', handleIncidentDeleted);
  }, [selectedIncident?.id]);

  const sortedIncidents = useMemo(() => {
    return [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
  }, [incidents]);

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'category',
      placeholder: 'Todos los tipos',
      value: category === 'all' ? '' : category,
      onChange: (val) => {
        setCategory(val || 'all');
        setPage(1);
      },
      options: [
        { value: '', label: 'Todos los tipos' },
        { value: 'Dificultad en la Tarea', label: 'Dificultad en la Tarea' },
        { value: 'Problema en Jaula', label: 'Problema en Jaula' },
        { value: 'Salud del Conejo', label: 'Salud del Conejo' },
        { value: 'Falta de Insumos', label: 'Falta de Insumos' },
        { value: 'Limpieza e Higiene', label: 'Limpieza e Higiene' },
        { value: 'Aviso General', label: 'Aviso General' },
      ],
    },
    {
      key: 'module',
      placeholder: 'Todas las labores',
      value: moduleFilter === 'all' ? '' : moduleFilter,
      onChange: (val) => {
        setModuleFilter(val || 'all');
        setPage(1);
      },
      options: [
        { value: '', label: 'Todas las labores' },
        { value: 'alimentacion', label: 'Alimentación' },
        { value: 'limpieza', label: 'Limpieza' },
        { value: 'vacunacion', label: 'Vacunación' },
        { value: 'desparasitacion', label: 'Desparasitación' },
        { value: 'reproduccion', label: 'Reproducción' },
        { value: 'mortalidad', label: 'Mortalidad' },
        { value: 'general', label: 'En General' },
      ],
    },
  ], [category, moduleFilter]);

  const totalPages = pagination?.totalPages || 1;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!user.activeGalponId) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-lg font-bold text-main">Galpón no seleccionado</h2>
        <p className="text-sm text-muted mt-2">
          Debes seleccionar un galpón activo en la barra superior para acceder al registro y control de novedades.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Contenedor tipo Card unificado idéntico al Centro de Notificaciones */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50 overflow-hidden bg-card" padding="none">
        {/* Encabezado limpio con título y descripción */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-default bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-main">Novedades del Galpón</h1>
            <p className="text-muted mt-1 text-sm">
              {userRole === 'owner'
                ? 'Supervisa, atiende y responde a las novedades e incidencias reportadas por el personal'
                : 'Consulta el estado de tus novedades reportadas y registra avisos del galpón'}
            </p>
          </div>

          {userRole !== 'owner' && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} />
              <span>Registrar Novedad</span>
            </Button>
          )}
        </div>

        {/* Barra de Métricas: Números uniformes en text-main para modo claro y oscuro */}
        {/* Barra de Métricas: Números uniformes en text-main para modo claro y oscuro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border-b border-default bg-card">
          <div className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">
                {userRole === 'owner' ? 'Total Registradas' : 'Mis Novedades'}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-main mt-1">{counts.total || 0}</p>
              <p className="text-xs text-muted mt-0.5">
                {userRole === 'owner' ? 'Reportes de todo el personal' : 'Reportadas por mi usuario'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">
                {userRole === 'owner' ? 'Pendientes de Atención' : 'Mis Pendientes'}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-main mt-1">{counts.pending || 0}</p>
              <p className="text-xs text-muted mt-0.5">
                {userRole === 'owner' ? 'Por revisar y contestar' : 'En espera de revisión'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>

          <div className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">
                {userRole === 'owner' ? 'Atendidas' : 'Mis Atendidas'}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-main mt-1">
                {counts.reviewed ?? Math.max(0, (counts.total || 0) - (counts.pending || 0))}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {userRole === 'owner' ? 'Con respuesta enviada' : 'Con respuesta recibida'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-3.5 sm:p-5 border-b border-default bg-card space-y-4">
          {/* Fila 1: Control segmentado centrado como en Notificaciones */}
          <div className="flex flex-col sm:flex-row items-center justify-between sm:justify-center relative w-full gap-2">
            <div className="grid grid-cols-3 gap-1 p-1 bg-theme-surface rounded-xl border border-default w-full sm:w-88 max-w-sm shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStatus('all');
                  setPage(1);
                }}
                className={cn(
                  'py-1.5 px-3 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer',
                  status === 'all'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'text-muted hover:text-main'
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('pending');
                  setPage(1);
                }}
                className={cn(
                  'py-1.5 px-3 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer',
                  status === 'pending'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'text-muted hover:text-main'
                )}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('reviewed');
                  setPage(1);
                }}
                className={cn(
                  'py-1.5 px-3 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer',
                  status === 'reviewed'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'text-muted hover:text-main'
                )}
              >
                Atendidas
              </button>
            </div>

            {(category !== 'all' || moduleFilter !== 'all' || status !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setCategory('all');
                  setModuleFilter('all');
                  setStatus('all');
                  setSearch('');
                  setPage(1);
                }}
                className="self-end sm:self-auto sm:absolute sm:right-0 text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          {/* Fila 2: Búsqueda y selectores de filtros sin apilarse en doble fila */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 w-full">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-faint">
                <Search size={16} />
              </div>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-theme-surface dark:bg-slate-900 text-main dark:text-slate-100 border border-default rounded-lg text-sm transition-colors placeholder:text-theme-faint placeholder:truncate focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                placeholder="Buscar novedades..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
              <div className="w-full sm:w-44 min-w-0">
                <Select
                  options={filterConfigs[0].options}
                  value={filterConfigs[0].value}
                  onChange={(e) => filterConfigs[0].onChange(e.target.value)}
                  placeholder={filterConfigs[0].placeholder}
                />
              </div>
              <div className="w-full sm:w-44 min-w-0">
                <Select
                  options={filterConfigs[1].options}
                  value={filterConfigs[1].value}
                  onChange={(e) => filterConfigs[1].onChange(e.target.value)}
                  placeholder={filterConfigs[1].placeholder}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Listado unificado con divide-y idéntico a Notificaciones */}
        <div className="p-0 bg-card">
          {loading ? (
            <div className="p-12 text-center text-theme-faint">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p>Cargando novedades...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-16 text-center text-muted">
              <div className="w-14 h-14 rounded-2xl bg-theme-surface border border-strong text-muted flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-main">No se encontraron novedades</h3>
              <p className="text-xs text-muted max-w-md mx-auto mt-1">
                {search || status !== 'all' || category !== 'all'
                  ? 'No hay registros que coincidan con los filtros seleccionados.'
                  : 'El galpón se encuentra al día sin avisos o contratiempos reportados.'}
              </p>
              {userRole !== 'owner' && (
                <div className="mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFormOpen(true)}
                  >
                    + Registrar Novedad
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-default">
              {sortedIncidents.map((incident: Incident) => {
                const isUnread = userRole === 'owner' ? !incident.ownerRead : !incident.workerRead;
                const reporterName = incident.reporter?.fullName || incident.reporter?.username || 'Trabajador';
                return (
                  <div
                    key={incident.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenDetail(incident)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenDetail(incident);
                      }
                    }}
                    className={cn(
                      'p-3.5 sm:p-5 hover:bg-theme-surface/50 transition-colors flex flex-col gap-2.5 sm:gap-3 cursor-pointer group focus:outline-none',
                      isUnread && 'bg-primary-50/50 dark:bg-primary-900/15'
                    )}
                  >
                    {/* Fila Superior: Actor/Reportador y Fecha */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0 border border-primary-200 dark:border-primary-800/40">
                          {incident.status === 'resolved' || incident.status === 'reviewed' ? (
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-main text-xs sm:text-sm block truncate">
                            {userRole === 'owner' ? (
                              <>
                                <span className="hidden sm:inline">Reportado por </span>
                                <span className="sm:hidden">Por </span>
                                {reporterName}
                              </>
                            ) : (
                              'Mi reporte'
                            )}
                          </span>
                          <span className="text-xs text-muted hidden sm:block truncate">
                            {userRole === 'owner' ? 'Personal del galpón' : reporterName}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs text-theme-faint shrink-0 whitespace-nowrap">
                        {formatFriendlyDate(incident.createdAt)}
                      </span>
                    </div>

                    {/* Fila Central: Título y Explicación */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-main mb-1 group-hover:text-primary-600 transition-colors">
                        {incident.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted line-clamp-2 leading-relaxed">
                        {incident.description}
                      </p>
                    </div>

                    {/* Respuesta de la Administración si existe */}
                    {incident.ownerResponse && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-theme-surface border border-default text-xs text-main">
                        <div className="flex items-center gap-1.5 font-semibold text-primary-600 dark:text-primary-400 mb-1">
                          <CheckCircle2 size={14} />
                          <span>Respuesta de la administración:</span>
                        </div>
                        <p className="text-muted leading-relaxed line-clamp-2">
                          {incident.ownerResponse}
                        </p>
                      </div>
                    )}

                    {/* Fila Inferior: Badges a la izquierda, Acción a la derecha */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-default/50">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-theme-surface border border-default text-xs font-semibold text-muted">
                          {incident.category}
                        </span>
                        {getModuleLabel(incident.module) && (
                          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-primary-500/10 border border-primary-500/20 text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {getModuleLabel(incident.module)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {userRole !== 'owner' && incident.status === 'pending' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIncidentToDelete(incident.id);
                            }}
                            title="Eliminar novedad"
                            className="p-1 rounded-lg text-muted hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        <span className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                          {userRole === 'owner' && incident.status === 'pending' ? 'Atender novedad' : 'Ver detalle'}
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginación en pie de Card idéntico a Notificaciones */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-default flex justify-center bg-card">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Modal de formulario */}
      <IncidentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Modal de detalle y atención */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          refetch();
        }}
        userRole={userRole}
      />

      {/* Modal de confirmación para eliminar novedad */}
      <ConfirmDialog
        open={incidentToDelete !== null}
        onClose={() => setIncidentToDelete(null)}
        onConfirm={async () => {
          if (incidentToDelete !== null) {
            await deleteIncident(incidentToDelete);
            setIncidentToDelete(null);
          }
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
