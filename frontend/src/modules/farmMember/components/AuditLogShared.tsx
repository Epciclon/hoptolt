'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuditLogItem } from '../types/farmMember.types';
import { Button, Dialog } from '@/shared/ui';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatFriendlyDate, formatDateTime } from '@/shared/utils/dateUtils';

export interface AuditDiffItem {
  key: string;
  label: string;
  beforeVal: string;
  afterVal: string;
  beforeRaw?: any;
  afterRaw?: any;
  isChanged?: boolean;
}

export const AUDIT_IGNORED_DIFF_KEYS = new Set(['id', 'galponId', 'createdAt', 'updatedAt', 'profileId']);

const DEFAULT_ACTION_CLASS =
  'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border-gray-200 dark:border-slate-700';

export function useAuditLogsRealtime(galponId: number, channelPrefix: string, queryKeyName: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channelId = `${channelPrefix}_${galponId}_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [queryKeyName] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galponId, channelPrefix, queryKeyName, queryClient]);
}

interface AuditDateFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
}

export function AuditDateFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: Readonly<AuditDateFiltersProps>) {
  return (
    <>
      <div>
        <label htmlFor="filter-start-date" className="block text-xs font-medium text-muted mb-1">
          Desde
        </label>
        <input
          id="filter-start-date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full text-sm bg-theme-surface border border-default rounded-lg px-3 py-2 text-main focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="filter-end-date" className="block text-xs font-medium text-muted mb-1">
          Hasta
        </label>
        <input
          id="filter-end-date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full text-sm bg-theme-surface border border-default rounded-lg px-3 py-2 text-main focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>
    </>
  );
}

interface AuditClearFiltersButtonProps {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function AuditClearFiltersButton({
  hasActiveFilters,
  onResetFilters,
}: Readonly<AuditClearFiltersButtonProps>) {
  if (!hasActiveFilters) return null;
  return (
    <div className="flex justify-end pt-1">
      <button
        type="button"
        onClick={onResetFilters}
        className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
      >
        <RotateCcw size={13} />
        <span>Limpiar filtros</span>
      </button>
    </div>
  );
}

interface AuditFallbackBeforeAfterProps {
  before: any;
  after: any;
}

export function AuditFallbackBeforeAfter({ before, after }: Readonly<AuditFallbackBeforeAfterProps>) {
  return (
    <div className="space-y-2">
      {before && (
        <div>
          <span className="text-xs font-semibold text-muted block mb-1">Estado anterior</span>
          <span className="text-xs text-main">{String(before)}</span>
        </div>
      )}
      {after && (
        <div>
          <span className="text-xs font-semibold text-muted block mb-1">Nuevo estado</span>
          <span className="text-xs text-main">{String(after)}</span>
        </div>
      )}
    </div>
  );
}

interface AuditStandardDiffValueProps {
  beforeVal: string;
  afterVal: string;
}

export function AuditStandardDiffValue({ beforeVal, afterVal }: Readonly<AuditStandardDiffValueProps>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
      <span className="line-through text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/30 break-words [word-break:break-word]">
        {beforeVal}
      </span>
      <span className="text-muted font-bold text-sm self-start sm:self-center">➔</span>
      <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/30 break-words [word-break:break-word]">
        {afterVal}
      </span>
    </div>
  );
}

interface AuditLogListCardProps {
  loading: boolean;
  logs: AuditLogItem[];
  hasActiveFilters: boolean;
  emptyDefaultMessage: string;
  entityLabels: Record<string, string>;
  actionConfig: Record<string, { label: string; className: string }>;
  renderActorIcon: (log: AuditLogItem, size: number) => React.ReactNode;
  getActorName: (log: AuditLogItem) => string;
  getActorUsername: (log: AuditLogItem) => string;
  getFallbackSummary: (entityLabel: string) => string;
  hasDetailedDiff: (log: AuditLogItem) => boolean;
  onSelectLog: (log: AuditLogItem) => void;
}

function stripAndExtractLegacyCages(rawSummary: string): { cleanSummary: string; bracketCages: number[] } {
  const lower = rawSummary.toLowerCase();
  const startIdx = lower.indexOf('[jaulas:');
  if (startIdx === -1) {
    return { cleanSummary: rawSummary, bracketCages: [] };
  }
  const endIdx = rawSummary.indexOf(']', startIdx);
  if (endIdx === -1) {
    return { cleanSummary: rawSummary, bracketCages: [] };
  }
  const inner = rawSummary.slice(startIdx + 8, endIdx);
  const bracketCages = inner
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
  const before = rawSummary.slice(0, startIdx).trimEnd();
  const after = rawSummary.slice(endIdx + 1);
  return { cleanSummary: `${before}${after}`, bracketCages };
}

export function extractAuditSummaryAndCages(
  log: AuditLogItem,
  fallbackSummary: string
): { cleanSummary: string; pendingCages: number[] } {
  const rawSummary = String(log.details?.summary || fallbackSummary);
  const { cleanSummary, bracketCages } = stripAndExtractLegacyCages(rawSummary);

  const rawCages = Array.isArray(log.details?.cages) ? log.details.cages : [];
  let parsedCages: number[] = rawCages
    .map((c: any) => (typeof c === 'object' && c?.number !== undefined ? Number(c.number) : Number(c)))
    .filter((n: number) => !Number.isNaN(n));

  if (parsedCages.length === 0) {
    parsedCages = bracketCages;
  }

  const uniqueSorted = Array.from(new Set(parsedCages)).sort((a, b) => a - b);
  return { cleanSummary, pendingCages: uniqueSorted };
}

export function AuditLogListCard({
  loading,
  logs,
  hasActiveFilters,
  emptyDefaultMessage,
  entityLabels,
  actionConfig,
  renderActorIcon,
  getActorName,
  getActorUsername,
  getFallbackSummary,
  hasDetailedDiff,
  onSelectLog,
}: Readonly<AuditLogListCardProps>) {
  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-strong overflow-hidden">
        <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          <span className="text-sm">Cargando registros...</span>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-strong overflow-hidden">
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-theme-surface flex items-center justify-center text-muted">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-main">Sin registros para mostrar</h4>
            <p className="text-sm text-muted mt-1">
              {hasActiveFilters
                ? 'No hay registros que coincidan con los filtros aplicados'
                : emptyDefaultMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-strong overflow-hidden">
      <div className="divide-y divide-default">
        {logs.map((log: AuditLogItem) => {
          const actionConf = actionConfig[log.action] || {
            label: log.action,
            className: DEFAULT_ACTION_CLASS,
          };
          const entityLabel = entityLabels[log.entity] || log.entity;
          const showDetailBtn = hasDetailedDiff(log);
          const { cleanSummary, pendingCages } = extractAuditSummaryAndCages(
            log,
            getFallbackSummary(entityLabel)
          );

          return (
            <div
              key={log.id}
              className="p-3.5 sm:p-4 hover:bg-theme-surface/50 transition-colors flex flex-col gap-2.5 sm:gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary-200 dark:border-primary-800/40">
                    {renderActorIcon(log, 16)}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-main text-xs sm:text-sm block truncate">
                      {getActorName(log)}
                    </span>
                    <span className="text-[11px] sm:text-xs text-muted block truncate">
                      @{getActorUsername(log)}
                    </span>
                  </div>
                </div>

                <span
                  className="text-xs text-theme-faint shrink-0 whitespace-nowrap"
                  title={formatDateTime(log.createdAt)}
                >
                  {formatFriendlyDate(log.createdAt)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-main leading-relaxed break-words">
                {cleanSummary}
              </p>

              {pendingCages.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <span className="text-xs font-semibold text-muted">Jaulas sin alimentar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingCages.map((cageNum) => (
                      <span
                        key={cageNum}
                        className="min-w-[2.25rem] h-8 px-2.5 rounded-md text-xs font-semibold border bg-theme-surface dark:bg-card text-main border-default shadow-sm inline-flex items-center justify-center"
                        title={`Jaula ${cageNum}`}
                      >
                        {cageNum}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-default/50">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-theme-surface border border-default text-main">
                    {entityLabel}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${actionConf.className}`}
                  >
                    {actionConf.label}
                  </span>
                </div>

                {showDetailBtn && (
                  <button
                    type="button"
                    onClick={() => onSelectLog(log)}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium cursor-pointer shrink-0 py-1 px-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                  >
                    Ver detalle →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AuditLogDetailDialogProps {
  selectedLog: AuditLogItem | null;
  onClose: () => void;
  title: string;
  entityLabels: Record<string, string>;
  actionConfig: Record<string, { label: string; className: string }>;
  renderActorIcon: (log: AuditLogItem, size: number) => React.ReactNode;
  getActorName: (log: AuditLogItem) => string;
  getActorUsername: (log: AuditLogItem) => string;
  getModalFallbackSummary: (entityLabel: string) => string;
  renderDetailsView: (log: AuditLogItem) => React.ReactNode;
}

export function AuditLogDetailDialog({
  selectedLog,
  onClose,
  title,
  entityLabels,
  actionConfig,
  renderActorIcon,
  getActorName,
  getActorUsername,
  getModalFallbackSummary,
  renderDetailsView,
}: Readonly<AuditLogDetailDialogProps>) {
  return (
    <Dialog open={Boolean(selectedLog)} onClose={onClose} title={title} size="2xl">
      {selectedLog && (() => {
        const entityLabel = entityLabels[selectedLog.entity] || selectedLog.entity;
        const actionConf = actionConfig[selectedLog.action] || {
          label: selectedLog.action,
          className: DEFAULT_ACTION_CLASS,
        };

        return (
          <div className="space-y-3 pt-1">
            <div className="bg-theme-surface border border-default rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm shrink-0 border border-primary-200 dark:border-primary-800/40">
                  {renderActorIcon(selectedLog, 18)}
                </div>
                <div>
                  <div className="font-semibold text-main text-sm">{getActorName(selectedLog)}</div>
                  <div className="text-xs text-muted">@{getActorUsername(selectedLog)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-theme-surface border border-default text-main">
                  {entityLabel}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${actionConf.className}`}
                >
                  {actionConf.label}
                </span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-main font-medium leading-relaxed bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-xl p-2.5 sm:p-3">
              {extractAuditSummaryAndCages(selectedLog, getModalFallbackSummary(entityLabel)).cleanSummary}
            </div>

            <div className="text-xs text-muted flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-1">
              <span className="shrink-0">Fecha y hora del registro:</span>
              <span className="font-medium text-main">{formatDateTime(selectedLog.createdAt)}</span>
            </div>

            <div className="pt-2 border-t border-default">{renderDetailsView(selectedLog)}</div>

            <div className="flex justify-end pt-2 border-t border-default">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        );
      })()}
    </Dialog>
  );
}

