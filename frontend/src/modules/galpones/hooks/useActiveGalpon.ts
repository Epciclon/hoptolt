'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { galponService } from '../services/galpon.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function useActiveGalpon() {
  const { refetchUser } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: activeGalpon = null, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['activeGalpon'],
    queryFn: async () => {
      const galpon = await galponService.getActive();
      return galpon || null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const setActiveMutation = useMutation({
    mutationFn: async (galponId: number) => {
      await galponService.setActive(galponId);
      const galpon = await galponService.getActive();
      await refetchUser(true);
      return galpon;
    },
    onSuccess: (galpon) => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'galpones' && query.queryKey[0] !== 'activeGalpon'
      });
      queryClient.setQueryData(['activeGalpon'], galpon);
    }
  });

  const setActive = async (galponId: number): Promise<boolean> => {
    try {
      await setActiveMutation.mutateAsync(galponId);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  let errorStr = null;
  if (queryError) {
    errorStr = (queryError as Error).message;
  } else if (setActiveMutation.error) {
    errorStr = (setActiveMutation.error as Error).message;
  }
  const error = errorStr;

  return { activeGalpon, loading, error, setActive };
}

