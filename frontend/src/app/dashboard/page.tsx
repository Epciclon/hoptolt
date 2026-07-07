'use client';

import { Suspense, useEffect, useState } from 'react';
import { Card } from '@/shared/ui';
import { Box, Rabbit, Dna, ArrowLeftRight } from 'lucide-react';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { DashboardCalendar } from '@/modules/reproduction/components/DashboardCalendar';
import { InvitationBanner } from '@/modules/invitation/components/InvitationBanner';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import api from '@/lib/api';

interface GalponStats {
  totalCages: number;
  totalRabbits: number;
  totalRaces: number;
  totalAssignments: number;
}

const statsMeta = [
  { key: 'totalCages' as keyof GalponStats, label: 'Total Jaulas', icon: Box, color: 'text-primary-500', bg: 'bg-primary-50' },
  { key: 'totalRabbits' as keyof GalponStats, label: 'Total Conejos', icon: Rabbit, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'totalRaces' as keyof GalponStats, label: 'Razas Registradas', icon: Dna, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'totalAssignments' as keyof GalponStats, label: 'Asignaciones', icon: ArrowLeftRight, color: 'text-amber-500', bg: 'bg-amber-50' },
];

function DashboardHomeContent() {
  const { user } = useAuthContext();
  const { activeGalpon, loading: galponLoading } = useActiveGalpon();
  const [stats, setStats] = useState<GalponStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!activeGalpon?.id) {
      setStats(null);
      return;
    }
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const { data } = await api.get<{ success: boolean; stats: GalponStats }>(`/galpones/${activeGalpon.id}/stats`);
        setStats(data.stats);
      } catch {
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [activeGalpon?.id]);

  const isLoading = galponLoading || loadingStats;

  return (
    <div>
      <InvitationBanner />
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          ¡Hola {user?.fullName?.split(' ')[0] || 'Criador'}, bienvenido a Hoptolt!
        </h2>
        <p className="text-base text-slate-500 mt-1">
          {activeGalpon
            ? `Panel de control y estado de tu galpón activo: ${activeGalpon.name}`
            : 'Selecciona un galpón para empezar'}
        </p>
      </div>

      {/* Calendario de Dashboard */}
      <Card>
        <div className="px-1 pb-1 pt-2">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
          }>
            <DashboardCalendar />
          </Suspense>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-6">
        {statsMeta.map((stat) => {
          const Icon = stat.icon;
          const value = stats ? stats[stat.key] : null;
          return (
            <Card key={stat.label} padding="md">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon size={26} className={stat.color} />
                </div>
                <div>
                  {isLoading ? (
                    <div className="h-8 w-12 bg-slate-200 rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-800">
                      {value !== null && value !== undefined ? value : '—'}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    }>
      <DashboardHomeContent />
    </Suspense>
  );
}
