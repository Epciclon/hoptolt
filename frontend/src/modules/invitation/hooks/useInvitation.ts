'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationService } from '../services/invitation.service';
import type { Invitation } from '../types/invitation.types';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';

export function useInvitation() {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  // Query: Fetch Pending Invitations for me
  const {
    data: pendingInvitations = [],
    isLoading: loadingPending,
    error: errorPending,
    refetch: fetchMyPending,
  } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: () => invitationService.getMyPendingInvitations(),
  });

  // Query: Fetch Invitations by Galpon
  const {
    data: galponInvitations = [],
    isLoading: loadingGalpon,
    error: errorGalpon,
    refetch: fetchByGalpon,
  } = useQuery({
    queryKey: ['invitations', 'galpon', activeGalpon?.id],
    queryFn: () => invitationService.getInvitationsByGalpon(activeGalpon!.id),
    enabled: !!activeGalpon,
  });

  const invitations = [...pendingInvitations, ...galponInvitations].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
  const loading = loadingPending || loadingGalpon;
  const error = errorPending ? (errorPending as Error).message : (errorGalpon ? (errorGalpon as Error).message : null);

  const createInvitationMutation = useMutation({
    mutationFn: ({ galponId, email }: { galponId: number; email: string }) => invitationService.createInvitation(galponId, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const createInvitation = async (galponId: number, email: string) => {
    try {
      await createInvitationMutation.mutateAsync({ galponId, email });
      return true;
    } catch (err) {
      return false;
    }
  };

  const acceptInvitationMutation = useMutation({
    mutationFn: (token: string) => invitationService.acceptInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      // Invalidate farm member data as well since a new member joined
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const acceptInvitation = async (token: string) => {
    try {
      await acceptInvitationMutation.mutateAsync(token);
      return true;
    } catch (err) {
      return false;
    }
  };

  const revokeInvitationMutation = useMutation({
    mutationFn: (token: string) => invitationService.revokeInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const revokeInvitation = async (token: string) => {
    try {
      await revokeInvitationMutation.mutateAsync(token);
      return true;
    } catch (err) {
      return false;
    }
  };

  return {
    invitations,
    loading,
    error,
    fetchMyPending,
    fetchByGalpon,
    createInvitation,
    acceptInvitation,
    revokeInvitation,
  };
}
