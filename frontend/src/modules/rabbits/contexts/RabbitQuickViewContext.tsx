'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { rabbitService } from '../services/rabbit.service';
import type { Rabbit } from '../types/rabbit.types';
import { RabbitDetailsModal } from '../components/RabbitDetailsModal';
import { useToast } from '@/shared/contexts/ToastContext';

export interface OpenRabbitQuickViewParams {
  rabbitId?: number | null;
  rabbitCode?: string | null;
  rabbit?: Rabbit | null;
}

interface RabbitQuickViewContextValue {
  openRabbitDetails: (params: OpenRabbitQuickViewParams) => Promise<void>;
  closeRabbitDetails: () => void;
}

const RabbitQuickViewContext = createContext<RabbitQuickViewContextValue | null>(null);

export function RabbitQuickViewProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { showToast } = useToast();
  const [rabbitStack, setRabbitStack] = useState<Rabbit[]>([]);

  const closeRabbitDetails = useCallback(() => {
    setRabbitStack(prev => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const closeRabbitAt = useCallback((index: number) => {
    setRabbitStack(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  const pushOrUpdateRabbit = useCallback((rabbitData: Rabbit) => {
    setRabbitStack(prev => {
      const top = prev[prev.length - 1];
      if (top && top.id === rabbitData.id) {
        const updated = [...prev];
        updated[updated.length - 1] = rabbitData;
        return updated;
      }
      return [...prev, rabbitData];
    });
  }, []);

  const openRabbitDetails = useCallback(async ({ rabbitId, rabbitCode, rabbit }: OpenRabbitQuickViewParams) => {
    if (rabbit && rabbit.sex && rabbit.purpose) {
      pushOrUpdateRabbit(rabbit);
      if (rabbit.id) {
        rabbitService.getById(rabbit.id)
          .then((fresh) => {
            setRabbitStack(prev =>
              prev.map(item => (item.id === fresh.id ? fresh : item))
            );
          })
          .catch(() => {
            // Keep existing rabbit data if refresh fails
          });
      }
      return;
    }

    try {
      let fetched: Rabbit | null = null;
      if (rabbitId) {
        fetched = await rabbitService.getById(rabbitId);
      } else if (rabbitCode) {
        const { rabbits } = await rabbitService.getAll({ search: rabbitCode, limit: 50 });
        fetched = rabbits.find(r => r.code.toLowerCase() === rabbitCode.trim().toLowerCase()) || null;
      }

      if (fetched) {
        pushOrUpdateRabbit(fetched);
      } else {
        showToast('No se encontró la ficha activa de este ejemplar.', 'info');
      }
    } catch {
      showToast('Este ejemplar ya no se encuentra activo en el galpón.', 'info');
    }
  }, [showToast, pushOrUpdateRabbit]);

  const contextValue = useMemo(() => ({
    openRabbitDetails,
    closeRabbitDetails,
  }), [openRabbitDetails, closeRabbitDetails]);

  return (
    <RabbitQuickViewContext.Provider value={contextValue}>
      {children}
      {rabbitStack.map((item, index) => (
        <RabbitDetailsModal
          key={`${item.id}-${index}`}
          open={true}
          onClose={() => closeRabbitAt(index)}
          rabbit={item}
        />
      ))}
    </RabbitQuickViewContext.Provider>
  );
}

export function useRabbitQuickView() {
  return useContext(RabbitQuickViewContext);
}
