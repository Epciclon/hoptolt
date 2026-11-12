'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { rabbitService } from '../services/rabbit.service';
import type { Rabbit } from '../types/rabbit.types';
import { RabbitDetailsModal } from '../components/RabbitDetailsModal';
import { Dialog } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';

export interface OpenRabbitQuickViewParams {
  rabbitId?: number | null;
  rabbitCode?: string | null;
  rabbit?: Rabbit | null;
}

type QuickViewEntry =
  | { key: string; status: 'ready'; rabbit: Rabbit }
  | { key: string; status: 'loading'; rabbitId?: number | null; rabbitCode?: string | null };

interface RabbitQuickViewContextValue {
  openRabbitDetails: (params: OpenRabbitQuickViewParams) => Promise<void>;
  closeRabbitDetails: () => void;
}

const RabbitQuickViewContext = createContext<RabbitQuickViewContextValue | null>(null);

function findCachedRabbit(
  queryClient: QueryClient,
  rabbitId?: number | null,
  rabbitCode?: string | null
): Rabbit | null {
  if (rabbitId) {
    const direct = queryClient.getQueryData<Rabbit>(['rabbitDetail', rabbitId]);
    if (direct && direct.sex && direct.purpose) return direct;
  }

  const normalizedCode = rabbitCode?.trim().toLowerCase();
  const listQueries = queryClient.getQueriesData<any>({ queryKey: ['rabbits'] });
  for (const [, data] of listQueries) {
    const items: Rabbit[] | undefined = Array.isArray(data) ? data : data?.rabbits;
    if (!Array.isArray(items)) continue;
    const match = items.find((item) => {
      if (rabbitId && item.id === rabbitId) return true;
      if (normalizedCode && item.code?.toLowerCase() === normalizedCode) return true;
      return false;
    });
    if (match && match.sex && match.purpose) return match;
  }

  return null;
}

export function RabbitQuickViewProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [rabbitStack, setRabbitStack] = useState<QuickViewEntry[]>([]);

  const closeRabbitDetails = useCallback(() => {
    setRabbitStack(prev => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const closeEntryByKey = useCallback((key: string) => {
    setRabbitStack(prev => prev.filter(entry => entry.key !== key));
  }, []);

  const pushReadyEntry = useCallback((rabbitData: Rabbit) => {
    setRabbitStack(prev => {
      const top = prev.at(-1);
      if (top?.status === 'ready' && top.rabbit.id === rabbitData.id) {
        const updated = [...prev];
        updated[updated.length - 1] = { key: top.key, status: 'ready', rabbit: rabbitData };
        return updated;
      }
      return [...prev, { key: `${rabbitData.id}-${Date.now()}`, status: 'ready', rabbit: rabbitData }];
    });
  }, []);

  const openRabbitDetails = useCallback(async ({ rabbitId, rabbitCode, rabbit }: OpenRabbitQuickViewParams) => {
    if (rabbit && rabbit.sex && rabbit.purpose) {
      pushReadyEntry(rabbit);
      if (rabbit.id) {
        queryClient.setQueryData(['rabbitDetail', rabbit.id], rabbit);
        rabbitService.getById(rabbit.id)
          .then((fresh) => {
            queryClient.setQueryData(['rabbitDetail', fresh.id], fresh);
            setRabbitStack(prev =>
              prev.map(entry =>
                entry.status === 'ready' && entry.rabbit.id === fresh.id
                  ? { ...entry, rabbit: fresh }
                  : entry
              )
            );
          })
          .catch(() => {
            // Keep existing rabbit data if refresh fails
          });
      }
      return;
    }

    const cached = findCachedRabbit(queryClient, rabbitId, rabbitCode);
    if (cached) {
      pushReadyEntry(cached);
      if (cached.id) {
        queryClient.fetchQuery({
          queryKey: ['rabbitDetail', cached.id],
          queryFn: () => rabbitService.getById(cached.id),
          staleTime: 30_000,
        }).then((fresh) => {
          setRabbitStack(prev =>
            prev.map(entry =>
              entry.status === 'ready' && entry.rabbit.id === fresh.id
                ? { ...entry, rabbit: fresh }
                : entry
            )
          );
        }).catch(() => {});
      }
      return;
    }

    const tempKey = `loading-${rabbitId || rabbitCode || 'rabbit'}-${Date.now()}`;
    setRabbitStack(prev => [...prev, { key: tempKey, status: 'loading', rabbitId, rabbitCode }]);

    try {
      let fetched: Rabbit | null = null;
      if (rabbitId) {
        fetched = await queryClient.fetchQuery({
          queryKey: ['rabbitDetail', rabbitId],
          queryFn: () => rabbitService.getById(rabbitId),
          staleTime: 60_000,
        });
      } else if (rabbitCode) {
        const normalizedCode = rabbitCode.trim().toLowerCase();
        const { rabbits } = await rabbitService.getAll({ search: rabbitCode, limit: 50 });
        fetched = rabbits.find(r => r.code.toLowerCase() === normalizedCode) || null;
        if (fetched?.id) {
          queryClient.setQueryData(['rabbitDetail', fetched.id], fetched);
        }
      }

      if (fetched) {
        setRabbitStack(prev =>
          prev.map(entry =>
            entry.key === tempKey
              ? { key: entry.key, status: 'ready', rabbit: fetched }
              : entry
          )
        );
      } else {
        closeEntryByKey(tempKey);
        showToast('No se encontró la ficha activa de este ejemplar.', 'info');
      }
    } catch {
      closeEntryByKey(tempKey);
      showToast('Este ejemplar ya no se encuentra activo en el galpón.', 'info');
    }
  }, [queryClient, showToast, pushReadyEntry, closeEntryByKey]);

  const contextValue = useMemo(() => ({
    openRabbitDetails,
    closeRabbitDetails,
  }), [openRabbitDetails, closeRabbitDetails]);

  return (
    <RabbitQuickViewContext.Provider value={contextValue}>
      {children}
      {rabbitStack.map((entry) =>
        entry.status === 'ready' ? (
          <RabbitDetailsModal
            key={entry.key}
            open={true}
            onClose={() => closeEntryByKey(entry.key)}
            rabbit={entry.rabbit}
          />
        ) : (
          <Dialog
            key={entry.key}
            open={true}
            onClose={() => closeEntryByKey(entry.key)}
            title={entry.rabbitCode ? `Cargando: ${entry.rabbitCode}` : 'Cargando detalles...'}
            size="xl"
          >
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
              <p className="text-sm text-muted">Obteniendo ficha del conejo...</p>
            </div>
          </Dialog>
        )
      )}
    </RabbitQuickViewContext.Provider>
  );
}

export function useRabbitQuickView() {
  return useContext(RabbitQuickViewContext);
}
