'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    // Listen to changes in various tables to invalidate react-query caches
    const channel = supabase.channel('global_db_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'galpones' }, () => {
        queryClient.invalidateQueries({ queryKey: ['galpones'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cages'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rabbits' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rabbits'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'races' }, () => {
        queryClient.invalidateQueries({ queryKey: ['races'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reproductions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['reproductions'] });
        queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vaccinations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dewormings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dewormings'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['feedings'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cleanings'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
        queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_members' }, () => {
        queryClient.invalidateQueries({ queryKey: ['farmMembers'] });
        queryClient.invalidateQueries({ queryKey: ['workers'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['invitations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'growths' }, () => {
        queryClient.invalidateQueries({ queryKey: ['growths'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mortalities' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mortalities'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);
}
