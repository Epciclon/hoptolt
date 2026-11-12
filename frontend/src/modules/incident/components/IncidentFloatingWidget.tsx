'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldAlert,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { useIncidents } from '../hooks/useIncidents';
import { incidentService } from '../services/incident.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { Button, ConfirmDialog } from '@/shared/ui';
import Link from 'next/link';
import { IncidentDetailModal } from './IncidentDetailModal';
import { IncidentFormModal } from './IncidentFormModal';
import type { Incident } from '../types/incident.types';
import { createClient } from '@/utils/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { playIncidentSound } from '@/shared/utils/soundUtils';
import { formatFriendlyDate, isIncidentFromToday } from '@/shared/utils/dateUtils';

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

function isRecentIncident(dateInput: string | Date | null | undefined): boolean {
  if (!dateInput) return false;
  const t = new Date(dateInput).getTime();
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) < (15 * 60 * 1000);
}

function detectNewlyArrivedIncident(
  incidents: Incident[],
  prevStateMap: Map<number, { hasResponse: boolean; workerRead: boolean; status: string }>,
  userId: string,
  isOwner: boolean
): Incident | null {
  if (isOwner) {
    const newlyArrived = incidents.filter(
      (i) => !prevStateMap.has(i.id) && i.status === 'pending'
    );
    if (newlyArrived.length === 0) return null;
    const latest = [...newlyArrived].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id
    )[0];
    if (String(latest.profileId).toLowerCase() !== String(userId).toLowerCase()) {
      return latest;
    }
    return null;
  }

  const newlyAnswered = incidents.filter((i) => {
    const prev = prevStateMap.get(i.id);
    const hadResponse = prev?.hasResponse ?? false;
    return Boolean(i.ownerResponse) && (!hadResponse || !i.workerRead) && !i.workerRead;
  });
  if (newlyAnswered.length === 0) return null;
  return [...newlyAnswered].sort(
    (a, b) => new Date(b.reviewedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.updatedAt || a.createdAt).getTime() || b.id - a.id
  )[0];
}

function isPreviewDismissed(id: number, userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(`hoptolt_inc_seen_${userId}_${id}`) === 'true' ||
    localStorage.getItem(`hoptolt_inc_seen_${userId}_${id}`) === 'true' ||
    sessionStorage.getItem(`hoptolt_inc_dismissed_${userId}_${id}`) === 'true' ||
    localStorage.getItem(`hoptolt_inc_dismissed_${userId}_${id}`) === 'true'
  );
}

function markPreviewSeen(id: number, userId: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`hoptolt_inc_seen_${userId}_${id}`, 'true');
    localStorage.setItem(`hoptolt_inc_seen_${userId}_${id}`, 'true');
  }
}

function markPreviewDismissed(id: number, userId: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`hoptolt_inc_dismissed_${userId}_${id}`, 'true');
    localStorage.setItem(`hoptolt_inc_dismissed_${userId}_${id}`, 'true');
  }
}

function findRecentCandidateIncident(
  incidents: Incident[],
  userId: string,
  isOwner: boolean
): Incident | null {
  if (isOwner) {
    const pendingUnattendedToday = incidents
      .filter((i) => {
        if (i.status !== 'pending' || i.ownerRead) return false;
        if (isPreviewDismissed(i.id, userId)) return false;
        return isRecentIncident(i.createdAt);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
    return pendingUnattendedToday[0] || null;
  }

  const answeredUnreadToday = incidents
    .filter((i) => {
      if (!i.ownerResponse || i.workerRead) return false;
      if (isPreviewDismissed(i.id, userId)) return false;
      return isRecentIncident(i.reviewedAt || i.updatedAt || i.createdAt);
    })
    .sort((a, b) => new Date(b.reviewedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.updatedAt || a.createdAt).getTime() || b.id - a.id);
  return answeredUnreadToday[0] || null;
}

function filterDisplayedIncidents(sortedIncidents: Incident[], isOwner: boolean, activeTab: string): Incident[] {
  if (!isOwner) return sortedIncidents;
  if (activeTab === 'pending') {
    return sortedIncidents.filter((i) => i.status === 'pending');
  }
  return sortedIncidents.filter((i) => i.status !== 'pending');
}

function getPreviewReporterLabel(incident: Incident, isOwner: boolean): string {
  if (!isOwner) return 'Mi reporte';
  const reporterName = incident.reporter?.fullName || incident.reporter?.username;
  if (reporterName) return `Por ${reporterName}`;
  return 'Reportado por trabajador';
}

function getPreviewActionButtonLabel(incident: Incident, isOwner: boolean): string {
  if (isOwner) return 'Atender Novedad';
  if (incident.ownerResponse) return 'Ver Respuesta';
  return 'Ver Novedad';
}

function getEmptyIncidentsTitle(isOwner: boolean, activeTab: string): string {
  if (!isOwner) return 'Sin novedades registradas';
  if (activeTab === 'pending') return 'Sin novedades pendientes';
  return 'Sin novedades atendidas';
}

function getEmptyIncidentsDescription(isOwner: boolean, activeTab: string): string {
  if (!isOwner) {
    return 'No tienes novedades registradas. Puedes reportar cualquier eventualidad.';
  }
  if (activeTab === 'pending') {
    return 'No hay incidencias reportadas por los trabajadores pendientes de atención.';
  }
  return 'Aún no se registran respuestas o resoluciones a novedades.';
}

interface IncidentFloatingPreviewCardProps {
  incident: Incident;
  isOwner: boolean;
  onDismiss: (e?: React.MouseEvent) => void;
  onSelect: (incident: Incident) => void;
}

function IncidentFloatingPreviewCard({
  incident,
  isOwner,
  onDismiss,
  onSelect,
}: Readonly<IncidentFloatingPreviewCardProps>) {
  return (
    <div className="fixed bottom-20 sm:bottom-24 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 sm:max-w-sm bg-card border border-teal-400 dark:border-teal-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300 z-50">
      {/* Header de la Previa */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-teal-700 via-teal-600 to-primary-700 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping shrink-0" />
          <ShieldAlert size={16} className="text-emerald-200 shrink-0" />
          <span className="font-bold text-xs truncate">
            {!isOwner && incident.ownerResponse ? 'Respuesta a tu Novedad' : 'Novedad en el Galpón'}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Cerrar aviso de novedad"
        >
          <X size={15} />
        </button>
      </div>

      {/* Contenido interactivo de la Previa */}
      <div className="relative p-3.5 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-theme-surface transition-colors block text-left">
        <button
          type="button"
          onClick={() => onSelect(incident)}
          aria-label={`Abrir novedad ${incident.title}`}
          className="absolute inset-0 w-full h-full z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="relative z-10 pointer-events-none">
          <div className="flex items-center justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 shrink-0">
                {incident.category}
              </span>
              {getModuleLabel(incident.module) && incident.module !== 'general' && (
                <span className="text-xs text-teal-700 dark:text-teal-400 font-medium truncate">
                  {getModuleLabel(incident.module)}
                </span>
              )}
            </div>
            <span className="text-xs text-muted shrink-0 whitespace-nowrap">
              {formatFriendlyDate(incident.createdAt)}
            </span>
          </div>

          <h4 className="text-sm font-bold text-main line-clamp-1">
            {incident.title}
          </h4>

          <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
            {incident.description}
          </p>

          {!isOwner && incident.ownerResponse && (
            <div className="mt-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-1 font-semibold text-xs mb-0.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={13} />
                <span>Respuesta del Propietario:</span>
              </div>
              <p className="line-clamp-2 leading-relaxed font-medium">
                {incident.ownerResponse}
              </p>
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-default/60 flex items-center justify-between gap-2">
            <span className="text-xs text-muted truncate">
              {getPreviewReporterLabel(incident, isOwner)}
            </span>
            <div className="pointer-events-auto">
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(incident);
                }}
                className="text-xs py-1 px-3 shadow-sm h-auto bg-gradient-to-r from-teal-600 to-primary-600 hover:from-teal-700 hover:to-primary-700 text-white border-0"
              >
                {getPreviewActionButtonLabel(incident, isOwner)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface IncidentListItemCardProps {
  incident: Incident;
  isOwner: boolean;
  onSelect: (incident: Incident) => void;
  onDelete: (id: number) => void;
}

function IncidentListItemCard({ incident, isOwner, onSelect, onDelete }: Readonly<IncidentListItemCardProps>) {
  const isUnread = isOwner ? !incident.ownerRead : !incident.workerRead;
  return (
    <div
      className={`relative p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
        isUnread
          ? 'bg-primary-500/5 border-primary-500/30 shadow-sm'
          : 'bg-theme-surface/60 hover:bg-theme-surface border-default'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(incident)}
        aria-label={`Ver detalle de ${incident.title}`}
        className="absolute inset-0 w-full h-full z-0 cursor-pointer rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="relative z-10 pointer-events-none flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
              {incident.category}
            </span>
            {getModuleLabel(incident.module) && incident.module !== 'general' && (
              <>
                <span className="text-muted text-xs">•</span>
                <span className="text-xs text-muted">
                  {getModuleLabel(incident.module)}
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-theme-faint shrink-0 whitespace-nowrap font-medium">
            {formatFriendlyDate(incident.createdAt)}
          </span>
        </div>

        <h4 className="text-sm font-bold text-main line-clamp-1">
          {incident.title}
        </h4>

        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
          {incident.description}
        </p>

        {incident.ownerResponse && (
          <div className="mt-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
            <MessageSquare size={13} className="shrink-0 mt-0.5" />
            <span className="line-clamp-1 font-medium">
              Propietario: {incident.ownerResponse}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted pt-1.5 border-t border-default/50">
          <span>
            {isOwner
              ? `Por ${incident.reporter?.fullName || incident.reporter?.username || 'Trabajador'}`
              : 'Mi reporte'}
          </span>
          <div className="flex items-center gap-2">
            {!isOwner && incident.status === 'pending' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(incident.id);
                }}
                title="Eliminar novedad"
                className="pointer-events-auto text-muted hover:text-red-600 p-1 rounded hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
            <span className="text-primary-600 font-semibold flex items-center gap-0.5">
              {isOwner && incident.status === 'pending' ? 'Atender novedad' : 'Ver detalle'}
              <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type IncidentWidgetTab = 'pending' | 'reviewed' | 'my-reports' | 'report';

interface IncidentFloatingPanelProps {
  isOwner: boolean;
  activeTab: IncidentWidgetTab;
  setActiveTab: (tab: IncidentWidgetTab) => void;
  unreadCount: number;
  pendingCount: number;
  totalCount: number;
  displayedIncidents: Incident[];
  markAsRead: (target: number | 'all') => void;
  onClose: () => void;
  onSelectIncident: (incident: Incident) => void;
  onDeleteIncident: (id: number) => void;
  onOpenAdvancedForm: () => void;
  quickCategory: string;
  setQuickCategory: (val: string) => void;
  quickTitle: string;
  setQuickTitle: (val: string) => void;
  quickDescription: string;
  setQuickDescription: (val: string) => void;
  quickError: string | null;
  isCreating: boolean;
  onQuickSubmit: (e: React.FormEvent) => void;
}

function IncidentFloatingPanel({
  isOwner,
  activeTab,
  setActiveTab,
  unreadCount,
  pendingCount,
  totalCount,
  displayedIncidents,
  markAsRead,
  onClose,
  onSelectIncident,
  onDeleteIncident,
  onOpenAdvancedForm,
  quickCategory,
  setQuickCategory,
  quickTitle,
  setQuickTitle,
  quickDescription,
  setQuickDescription,
  quickError,
  isCreating,
  onQuickSubmit,
}: Readonly<IncidentFloatingPanelProps>) {
  return (
    <div className="fixed bottom-20 sm:bottom-24 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-[420px] sm:max-w-lg bg-card border border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-6.5rem)] sm:max-h-[80vh] animate-fadeIn z-50">
      <div className="p-3 sm:p-3.5 border-b border-default bg-theme-surface/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
            <ShieldAlert size={18} />
          </div>
          <h3 className="text-sm font-bold text-main leading-tight">Novedades del Galpón</h3>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAsRead('all')}
              title="Marcar todas como leídas"
              className="p-1.5 rounded-lg text-muted hover:text-primary-600 hover:bg-theme-surface transition-colors"
            >
              <CheckCheck size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-theme-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-default bg-card px-2 pt-1 text-xs font-semibold shrink-0">
        {isOwner ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2.5 inline-flex items-center justify-center gap-1.5 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              <span>Pendientes</span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white font-bold text-[10px] leading-none shadow-xs">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviewed')}
              className={`flex-1 py-2.5 inline-flex items-center justify-center gap-1.5 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === 'reviewed'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              <span>Atendidas</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('my-reports')}
              className={`flex-1 py-2.5 inline-flex items-center justify-center gap-1.5 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === 'my-reports'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              <span>Mis Novedades</span>
              {totalCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white font-bold text-[10px] leading-none shadow-xs">
                  {totalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`flex-1 py-2.5 inline-flex items-center justify-center gap-1.5 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === 'report'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              <span>+ Reportar Novedad</span>
            </button>
          </>
        )}
      </div>

      <div className="p-3 overflow-y-auto flex-1 min-h-0 space-y-2.5">
        {!isOwner && activeTab === 'report' ? (
          <form onSubmit={onQuickSubmit} className="space-y-3 p-1">
            {quickError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{quickError}</span>
              </div>
            )}

            <div>
              <label htmlFor="quick-incident-category" className="block text-xs font-semibold text-main mb-1">
                Tipo de Novedad
              </label>
              <select
                id="quick-incident-category"
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-theme-surface border border-strong rounded-xl text-main focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Dificultad en la Tarea">Dificultad en la Tarea</option>
                <option value="Problema en Jaula">Problema en Jaula</option>
                <option value="Salud del Conejo">Salud del Conejo</option>
                <option value="Falta de Insumos">Falta de Insumos</option>
                <option value="Limpieza e Higiene">Limpieza e Higiene</option>
                <option value="Aviso General">Aviso General</option>
              </select>
            </div>

            <div>
              <label htmlFor="quick-incident-title" className="block text-xs font-semibold text-main mb-1">
                Motivo de la Novedad
              </label>
              <input
                id="quick-incident-title"
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Ejemplo: Bebedero con fuga de agua en jaula 4"
                className="w-full px-2.5 py-1.5 text-xs bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="quick-incident-description" className="block text-xs font-semibold text-main mb-1">
                Explicación Detallada
              </label>
              <textarea
                id="quick-incident-description"
                rows={3}
                value={quickDescription}
                onChange={(e) => setQuickDescription(e.target.value)}
                placeholder="Explica con calma lo sucedido..."
                className="w-full px-2.5 py-1.5 text-xs bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onOpenAdvancedForm}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-medium"
              >
                Formulario avanzado con jaulas
              </button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isCreating}
                className="text-xs"
              >
                {isCreating ? 'Guardando...' : 'Registrar Novedad'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            {displayedIncidents.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-theme-surface border border-strong text-muted flex items-center justify-center mx-auto mb-2.5">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <p className="text-xs font-semibold text-main">
                  {getEmptyIncidentsTitle(isOwner, activeTab)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {getEmptyIncidentsDescription(isOwner, activeTab)}
                </p>
              </div>
            ) : (
              displayedIncidents.map((incident) => (
                <IncidentListItemCard
                  key={incident.id}
                  incident={incident}
                  isOwner={isOwner}
                  onSelect={onSelectIncident}
                  onDelete={onDeleteIncident}
                />
              ))
            )}
          </>
        )}
      </div>

      <div className="p-2.5 sm:p-3 border-t border-default bg-theme-surface/70 flex items-center justify-end text-xs shrink-0">
        <Link
          href="/dashboard/incidents"
          onClick={onClose}
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-theme-surface transition-colors"
        >
          <span>Ver historial completo</span>
          <ExternalLink size={13} />
        </Link>
      </div>
    </div>
  );
}

function applyRealtimeDeleteToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  deletedId: number | undefined,
  setActiveIncidentPreview: React.Dispatch<React.SetStateAction<Incident | null>>
) {
  if (deletedId) {
    queryClient.setQueriesData({ queryKey: ['incidents', 'list'] }, (old: any) => {
      if (!old?.incidents) return old;
      return {
        ...old,
        incidents: old.incidents.filter((item: any) => item.id !== deletedId),
        pagination: {
          ...old.pagination,
          total: Math.max(0, (old.pagination?.total || 1) - 1)
        }
      };
    });
    queryClient.setQueriesData({ queryKey: ['incidents', 'counts'] }, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        total: Math.max(0, (old.total || 1) - 1),
        pending: Math.max(0, (old.pending || 1) - 1)
      };
    });
    setActiveIncidentPreview((prev) => (prev?.id === deletedId ? null : prev));
  }
  queryClient.invalidateQueries({ queryKey: ['incidents'] });
  window.dispatchEvent(new CustomEvent('incident-deleted', { detail: { incidentId: deletedId } }));
  window.dispatchEvent(new CustomEvent('incidents-updated'));
}

async function fetchAndTriggerIncidentPreview(
  row: any,
  safePlayIncidentSound: () => void,
  showIncidentPreview: (incident: Incident) => void
) {
  safePlayIncidentSound();
  try {
    const full = await incidentService.getById(row.id);
    showIncidentPreview(full || row);
  } catch {
    showIncidentPreview(row);
  }
}

function buildIncidentStateMap(incidents: Incident[]) {
  const stateMap = new Map<number, { hasResponse: boolean; workerRead: boolean; status: string }>();
  incidents.forEach((i) => {
    stateMap.set(i.id, {
      hasResponse: Boolean(i.ownerResponse),
      workerRead: Boolean(i.workerRead),
      status: i.status
    });
  });
  return stateMap;
}

export function IncidentFloatingWidget() {
  const { user } = useAuthContext();
  const supabase = useMemo(() => createClient(), []);
  
  // Parámetros estables para evitar re-renderizados continuos
  const queryParams = useMemo(() => ({ limit: 25 }), []);
  
  const {
    incidents,
    counts,
    userRole,
    refetch,
    createIncident,
    isCreating,
    markAsRead,
    deleteIncident,
    isDeleting
  } = useIncidents(queryParams);

  const queryClient = useQueryClient();
  const isOwner = user?.role === 'owner' || userRole === 'owner';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<IncidentWidgetTab>('pending');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<number | null>(null);

  // Previa Flotante Exclusiva para Novedades del Galpón
  const [activeIncidentPreview, setActiveIncidentPreview] = useState<Incident | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previewIncidentsEnabled, setPreviewIncidentsEnabled] = useState(true);

  useEffect(() => {
    const syncSetting = () => {
      const enabled = typeof window !== 'undefined' ? localStorage.getItem('hoptolt_preview_incidents') !== 'false' : true;
      setPreviewIncidentsEnabled(enabled);
      if (!enabled) {
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        setActiveIncidentPreview(null);
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

  const safePlayIncidentSound = () => {
    if (!previewIncidentsEnabled) return;
    if (typeof window !== 'undefined' && localStorage.getItem('hoptolt_preview_incidents') === 'false') return;
    playIncidentSound();
  };

  // Quick report state (solo para trabajador)
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState('Dificultad en la Tarea');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);

  // Sincronizar pestaña inicial según el rol
  useEffect(() => {
    if (isOwner && (activeTab === 'my-reports' || activeTab === 'report')) {
      setActiveTab('pending');
    } else if (!isOwner && (activeTab === 'pending' || activeTab === 'reviewed')) {
      setActiveTab('my-reports');
    }
  }, [isOwner, activeTab]);

  const handleOpenDetail = (incident: Incident) => {
    setSelectedIncident(incident);
    setDetailModalOpen(true);
    markAsRead(incident.id);
  };

  const showIncidentPreview = (incident: Incident) => {
    if (typeof window !== 'undefined' && localStorage.getItem('hoptolt_preview_incidents') === 'false') return;
    if (!previewIncidentsEnabled) return;
    setActiveIncidentPreview(incident);
    if (user?.id) {
      markPreviewSeen(incident.id, user.id);
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setActiveIncidentPreview(null);
    }, 14000);
  };

  const handleDismissPreview = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (activeIncidentPreview && user?.id) {
      markPreviewDismissed(activeIncidentPreview.id, user.id);
    }
    setActiveIncidentPreview(null);
  };

  const handleSelectPreviewIncident = (inc: Incident) => {
    handleDismissPreview();
    setIsOpen(true);
    setActiveTab(isOwner ? 'pending' : 'my-reports');
    handleOpenDetail(inc);
  };

  // Escuchar evento global desde notificaciones para abrir el widget y detalle automáticamente
  useEffect(() => {
    const resolveAndOpenIncident = async (incidentId: number) => {
      const found = incidents.find((i) => i.id === incidentId);
      if (found) {
        handleOpenDetail(found);
        return;
      }
      try {
        const fetched = await incidentService.getById(incidentId);
        if (fetched) {
          handleOpenDetail(fetched);
        }
      } catch (err) {
        console.error('Error al abrir detalle de novedad:', err);
      }
    };

    const handleOpenIncident = (event: any) => {
      const incidentId = event.detail?.incidentId;
      setIsOpen(true);
      if (isOwner) {
        setActiveTab('pending');
      }
      if (incidentId) {
        void resolveAndOpenIncident(incidentId);
      }
    };

    window.addEventListener('open-incident-widget', handleOpenIncident);
    return () => window.removeEventListener('open-incident-widget', handleOpenIncident);
  }, [incidents, isOwner]);

  // Si una novedad es eliminada mientras su modal o previa está abierta, cerrar inmediatamente
  useEffect(() => {
    const handleIncidentDeleted = (e: any) => {
      const deletedId = e.detail?.incidentId;
      if (!deletedId) return;
      if (selectedIncident?.id === deletedId) {
        setDetailModalOpen(false);
        setSelectedIncident(null);
      }
      if (activeIncidentPreview?.id === deletedId) {
        setActiveIncidentPreview(null);
      }
    };
    window.addEventListener('incident-deleted', handleIncidentDeleted);
    return () => window.removeEventListener('incident-deleted', handleIncidentDeleted);
  }, [selectedIncident?.id, activeIncidentPreview?.id]);

  // Escuchar en vivo nuevas novedades y respuestas mediante Supabase Realtime
  useEffect(() => {
    if (!user?.activeGalponId) return;

    const handleRealtimeEvent = async (payload: any) => {
      if (payload.eventType === 'DELETE') {
        applyRealtimeDeleteToCache(queryClient, payload.old?.id, setActiveIncidentPreview);
        return;
      }

      const newRow = payload.new;
      const rowGalponId = newRow?.galponId ?? newRow?.galpon_id ?? newRow?.galponid;
      if (!newRow || !rowGalponId || String(rowGalponId) !== String(user.activeGalponId)) return;

      const rowProfileId = newRow.profileId ?? newRow.profile_id ?? newRow.profileid;
      const isFromOtherUser = !rowProfileId || String(rowProfileId).toLowerCase() !== String(user.id).toLowerCase();
      const rowWorkerRead = newRow.workerRead ?? newRow.worker_read ?? newRow.workerread;

      const shouldNotifyOwner = payload.eventType === 'INSERT' && isOwner && isFromOtherUser;
      const shouldNotifyWorker = payload.eventType === 'UPDATE' && !isOwner && !isFromOtherUser && !rowWorkerRead;

      if (shouldNotifyOwner || shouldNotifyWorker) {
        await fetchAndTriggerIncidentPreview(newRow, safePlayIncidentSound, showIncidentPreview);
      }

      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      window.dispatchEvent(new CustomEvent('incidents-updated'));
    };

    const channelId = `widget_incidents_rt_${user.id}_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, handleRealtimeEvent)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [user?.id, user?.activeGalponId, isOwner, supabase, queryClient]);

  const previousIncidentStateRef = useRef<Map<number, { hasResponse: boolean; workerRead: boolean; status: string }>>(new Map());
  const isInitialIncidentsLoadRef = useRef(true);

  // Detección reactiva asíncrona ante la llegada de nuevas novedades o respuestas
  useEffect(() => {
    if (!incidents || incidents.length === 0 || !user?.id) return;

    if (isInitialIncidentsLoadRef.current) {
      isInitialIncidentsLoadRef.current = false;
      previousIncidentStateRef.current = buildIncidentStateMap(incidents);
      return;
    }

    const newlyIncident = detectNewlyArrivedIncident(incidents, previousIncidentStateRef.current, user.id, isOwner);
    const shouldShowNewlyIncident =
      newlyIncident &&
      !isPreviewDismissed(newlyIncident.id, user.id) &&
      activeIncidentPreview?.id !== newlyIncident.id;

    if (shouldShowNewlyIncident) {
      const dateToCheck = isOwner ? newlyIncident.createdAt : (newlyIncident.reviewedAt || newlyIncident.updatedAt || newlyIncident.createdAt);
      if (isIncidentFromToday(dateToCheck)) {
        safePlayIncidentSound();
        showIncidentPreview(newlyIncident);
      }
    }

    previousIncidentStateRef.current = buildIncidentStateMap(incidents);
  }, [incidents, isOwner, user?.id, activeIncidentPreview?.id]);

  // Previa de novedad o respuesta al iniciar sesión, esperando que terminen las notificaciones
  useEffect(() => {
    if (isOpen || !user?.id || !previewIncidentsEnabled || activeIncidentPreview) return;

    const candidate = findRecentCandidateIncident(incidents, user.id, isOwner);
    if (!candidate) return;

    markPreviewSeen(candidate.id, user.id);

    const triggerPreview = () => {
      if (isOpen || !previewIncidentsEnabled) return;
      showIncidentPreview(candidate);
      safePlayIncidentSound();
    };

    const hasNotifPreview = typeof window !== 'undefined' && Boolean((window as any).__hasActiveNotificationPreview);
    if (hasNotifPreview) {
      const handleNotifsFinished = () => {
        setTimeout(triggerPreview, 600);
      };
      window.addEventListener('notification-previews-finished', handleNotifsFinished, { once: true });
      return () => window.removeEventListener('notification-previews-finished', handleNotifsFinished);
    }

    const timer = setTimeout(triggerPreview, 1200);
    return () => clearTimeout(timer);
  }, [incidents, isOwner, isOpen, user?.id, activeIncidentPreview]);

  // Ordenar siempre de la más nueva a la más antigua
  const sortedIncidents = useMemo(() => {
    return [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
  }, [incidents]);

  if (!user?.activeGalponId) {
    return null;
  }

  const unreadCount = counts.unread || 0;
  const pendingCount = counts.pending || 0;
  const hasAlert = unreadCount > 0;

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);

    const validationError =
      (!quickCategory.trim() && 'El tipo de novedad es obligatorio.') ||
      (!quickTitle.trim() && 'El motivo de la novedad es obligatorio.') ||
      (!quickDescription.trim() && 'La explicación de la novedad es obligatoria.') ||
      null;

    if (validationError) {
      setQuickError(validationError);
      return;
    }

    try {
      await createIncident({
        title: quickTitle.trim(),
        category: quickCategory,
        module: 'general',
        description: quickDescription.trim()
      });
      setQuickTitle('');
      setQuickDescription('');
      setQuickCategory('Dificultad en la Tarea');
      setActiveTab('my-reports');
    } catch (err: any) {
      setQuickError(err?.message || 'Error al registrar la novedad.');
    }
  };

  const displayedIncidents = filterDisplayedIncidents(sortedIncidents, isOwner, activeTab);

  return (
    <>
      {/* Floating Action Button y Previa Flotante */}
      <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-30">
        {activeIncidentPreview && !isOpen && (
          <IncidentFloatingPreviewCard
            incident={activeIncidentPreview}
            isOwner={isOwner}
            onDismiss={handleDismissPreview}
            onSelect={handleSelectPreviewIncident}
          />
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir panel de novedades"
          className={`relative group w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
            isOpen
              ? 'bg-slate-800 text-white rotate-90'
              : 'bg-gradient-to-tr from-primary-700 via-primary-600 to-teal-500 text-white hover:shadow-primary-500/30 hover:scale-105'
          }`}
        >
          {hasAlert && !isOpen && (
            <>
              <span className="absolute -inset-1 rounded-full bg-primary-400 opacity-75 animate-ping" />
              <span className="absolute -inset-1.5 rounded-full border-2 border-primary-300 animate-pulse" />
            </>
          )}

          {isOpen ? (
            <X size={20} className="relative z-10 transition-transform sm:w-6 sm:h-6" />
          ) : (
            <ShieldAlert size={20} className={`relative z-10 sm:w-6 sm:h-6 ${hasAlert ? 'animate-bounce' : ''}`} />
          )}

          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 z-20 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-md animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent border-none w-full h-full cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar novedades"
          />
        )}

        {isOpen && (
          <IncidentFloatingPanel
            isOwner={isOwner}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            unreadCount={unreadCount}
            pendingCount={pendingCount}
            totalCount={counts.total}
            displayedIncidents={displayedIncidents}
            markAsRead={markAsRead}
            onClose={() => setIsOpen(false)}
            onSelectIncident={handleOpenDetail}
            onDeleteIncident={setIncidentToDelete}
            onOpenAdvancedForm={() => setFormModalOpen(true)}
            quickCategory={quickCategory}
            setQuickCategory={setQuickCategory}
            quickTitle={quickTitle}
            setQuickTitle={setQuickTitle}
            quickDescription={quickDescription}
            setQuickDescription={setQuickDescription}
            quickError={quickError}
            isCreating={isCreating}
            onQuickSubmit={handleQuickSubmit}
          />
        )}
      </div>

      {/* Advanced Form Modal (Solo para Trabajador) */}
      <IncidentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => setActiveTab('my-reports')}
      />

      {/* Detail & Response Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          refetch();
        }}
        userRole={userRole}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={incidentToDelete !== null}
        onClose={() => setIncidentToDelete(null)}
        onConfirm={async () => {
          if (incidentToDelete !== null) {
            const targetId = incidentToDelete;
            setIncidentToDelete(null);
            setActiveIncidentPreview((prev) => (prev?.id === targetId ? null : prev));
            await deleteIncident(targetId);
            refetch();
          }
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
