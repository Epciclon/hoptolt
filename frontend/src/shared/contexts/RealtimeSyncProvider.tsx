'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function RealtimeSyncProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { user } = useAuthContext();

  useEffect(() => {
    // Only subscribe to realtime sync if the user is authenticated
    if (!user) return;

    const tables = [
      'rabbits', 'cages', 'assign_rabbits', 'feedings', 
      'vaccinations', 'dewormings', 'cleanings', 
      'reproductions', 'mortalities', 'races', 
      'farm_members', 'growths', 'invitations',
      'galpones', 'worker_cages', 'worker_permissions',
      'profiles', 'genealogies'
    ];

    let channel = supabase.channel('global_schema_sync');

    tables.forEach(tableName => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload: any) => {
          switch (tableName) {
            case 'rabbits':
              queryClient.invalidateQueries({ queryKey: ['rabbits'] });
              queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
              queryClient.invalidateQueries({ queryKey: ['unassignedRabbits'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
              queryClient.invalidateQueries({ queryKey: ['genealogy'] });
              queryClient.invalidateQueries({ queryKey: ['growthRecords'] });
              break;
            case 'cages':
              queryClient.invalidateQueries({ queryKey: ['cages'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              break;
            case 'assign_rabbits':
              queryClient.invalidateQueries({ queryKey: ['assignments'] });
              queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
              queryClient.invalidateQueries({ queryKey: ['unassignedRabbits'] });
              break;
            case 'feedings':
              queryClient.invalidateQueries({ queryKey: ['feedings'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              break;
            case 'vaccinations':
              queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
              break;
            case 'dewormings':
              queryClient.invalidateQueries({ queryKey: ['dewormings'] });
              break;
            case 'cleanings':
              queryClient.invalidateQueries({ queryKey: ['cleanings'] });
              break;
            case 'reproductions':
              queryClient.invalidateQueries({ queryKey: ['reproductions'] });
              queryClient.invalidateQueries({ queryKey: ['reproductionCalendar'] });
              queryClient.invalidateQueries({ queryKey: ['reproductionDay'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
              break;
            case 'mortalities':
              queryClient.invalidateQueries({ queryKey: ['mortalities'] });
              queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
              queryClient.invalidateQueries({ queryKey: ['unassignedRabbits'] });
              queryClient.invalidateQueries({ queryKey: ['rabbits'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
              break;
            case 'races':
              queryClient.invalidateQueries({ queryKey: ['races'] });
              break;
            case 'farm_members':
              queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
              queryClient.invalidateQueries({ queryKey: ['farmMembers'] });
              queryClient.invalidateQueries({ queryKey: ['invitations'] });
              break;
            case 'growths':
              queryClient.invalidateQueries({ queryKey: ['growthRecords'] });
              queryClient.invalidateQueries({ queryKey: ['dailyWeights'] });
              break;
            case 'invitations':
              queryClient.invalidateQueries({ queryKey: ['invitations'] });
              queryClient.invalidateQueries({ queryKey: ['farmMembers'] });
              break;
            case 'galpones':
              queryClient.invalidateQueries({ queryKey: ['galpones'] });
              queryClient.invalidateQueries({ queryKey: ['activeGalpon'] });
              break;
            case 'worker_cages':
              queryClient.invalidateQueries({ queryKey: ['workerCages'] });
              break;
            case 'worker_permissions':
              queryClient.invalidateQueries({ queryKey: ['workerPermissions'] });
              break;
            case 'profiles':
              queryClient.invalidateQueries({ queryKey: ['profile'] });
              queryClient.invalidateQueries({ queryKey: ['farmMembers'] });
              break;
            case 'genealogies':
              queryClient.invalidateQueries({ queryKey: ['genealogy'] });
              break;
          }
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);

  return <>{children}</>;
}
