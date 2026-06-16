'use client';

import { useEffect, useState } from 'react';
import { useInvitation } from '../hooks/useInvitation';
import { useNotifications } from '@/modules/notification/hooks/useNotification';
import { Button } from '@/shared/ui';

export function InvitationBanner() {
  const { invitations, fetchMyPending, acceptInvitation, revokeInvitation } = useInvitation();
  const { addNotification } = useNotifications();
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  useEffect(() => {
    fetchMyPending();
  }, [fetchMyPending]);

  if (!invitations || invitations.length === 0) return null;

  const handleAccept = async (token: string) => {
    setLoadingToken(token);
    const success = await acceptInvitation(token);
    setLoadingToken(null);
    if (success) {
      const galponName = invitations.find(i => i.token === token)?.galpon?.name;
      addNotification({
        type: 'success',
        title: '¡Te has unido a un galpón!',
        message: `Ya puedes seleccionar "${galponName}" en la sección de Galpones.`
      });
    }
  };

  const handleReject = async (token: string) => {
    setLoadingToken(token);
    await revokeInvitation(token);
    setLoadingToken(null);
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      {invitations.map((inv) => (
        <div key={inv.token} className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 mb-3 sm:mb-0">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-teal-800">Tienes una invitación pendiente</h3>
              <p className="text-xs text-teal-600 mt-0.5">
                Has sido invitado por <span className="font-bold">{inv.inviter?.fullName || 'un usuario'}</span> a unirte como trabajador al galpón <span className="font-bold">"{inv.galpon?.name}"</span>.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex gap-2">
            <Button
              variant="danger"
              className="w-full sm:w-auto"
              disabled={loadingToken === inv.token}
              onClick={() => handleReject(inv.token)}
            >
              {loadingToken === inv.token ? 'Rechazando...' : 'Rechazar'}
            </Button>
            <Button
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white"
              disabled={loadingToken === inv.token}
              onClick={() => handleAccept(inv.token)}
            >
              {loadingToken === inv.token ? 'Aceptando...' : 'Aceptar Invitación'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
