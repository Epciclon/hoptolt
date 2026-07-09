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
    let channel = supabase.channel('global_db_sync');

    const tableMappings: Record<string, string[]> = {
      galpones: ['galpones'],
      cages: ['cages'],
      rabbits: ['rabbits'],
      races: ['races'],
      reproductions: ['reproductions', 'birthCalendar'],
      vaccinations: ['vaccinations'],
      dewormings: ['dewormings'],
      feedings: ['feedings'],
      cleanings: ['cleanings'],
      assignments: ['assignments', 'assignedRabbits'],
      farm_members: ['farmMembers', 'workers'],
      invitations: ['invitations'],
      growths: ['growths'],
      mortalities: ['mortalities']
    };

    Object.entries(tableMappings).forEach(([table, queryKeys]) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);
}
