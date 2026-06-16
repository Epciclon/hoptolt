'use client';

import { useState, useCallback } from 'react';
import { invitationService } from '../services/invitation.service';
import type { Invitation } from '../types/invitation.types';

export function useInvitation() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invitationService.getMyPendingInvitations();
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar invitaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByGalpon = useCallback(async (galponId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await invitationService.getInvitationsByGalpon(galponId);
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar invitaciones del galpón.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvitation = async (galponId: number, email: string) => {
    try {
      const inv = await invitationService.createInvitation(galponId, { email });
      setInvitations(prev => [inv, ...prev]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar trabajador.');
      return false;
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      await invitationService.acceptInvitation(token);
      setInvitations(prev => prev.filter(i => i.token !== token));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aceptar invitación.');
      return false;
    }
  };

  const revokeInvitation = async (token: string) => {
    try {
      await invitationService.revokeInvitation(token);
      setInvitations(prev => prev.map(i => i.token === token ? { ...i, status: 'revoked' } : i));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revocar invitación.');
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
    revokeInvitation
  };
}
