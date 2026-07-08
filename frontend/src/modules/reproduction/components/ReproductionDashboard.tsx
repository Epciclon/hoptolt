'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { Heart, Activity, Archive } from 'lucide-react';
import { MontasView } from './MontasView';
import { ReproductionCatalog } from './ReproductionCatalog';
import { GazaposView } from './GazaposView';
import { ReproductionHistoryView } from './ReproductionHistoryView';
import { useReproduction } from '../hooks/useReproduction';
import { Card, CardHeader } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function ReproductionDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('reproduction', 'montas');
  const { reproductions, fetchReproductions } = useReproduction();
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (!isInitialized) return null;

  const currentTab = !isOwner && activeTab === 'history' ? 'montas' : activeTab;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Reproducción" subtitle="Gestiona y monitorea los ciclos reproductivos" />
      <DashboardTabs
        tabs={[
          { id: 'montas', label: 'Fase 1: Montas', icon: <Heart size={18} /> },
          { id: 'partos', label: 'Fase 2: Gestación y Partos', icon: <Activity size={18} /> },
          { id: 'gazapos', label: 'Fase 3: Gazapos y Destetes', icon: <Activity size={18} /> },
          ...(isOwner ? [{ id: 'history', label: 'Historial', icon: <Archive size={18} /> }] : [])
        ]}
        activeTab={currentTab}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {currentTab === 'montas' && (
          <MontasView reproductions={reproductions} onSuccess={fetchReproductions} />
        )}
        {currentTab === 'partos' && (
          <ReproductionCatalog reproductions={reproductions} onSuccess={fetchReproductions} />
        )}
        {currentTab === 'gazapos' && (
          <GazaposView reproductions={reproductions} onSuccess={fetchReproductions} />
        )}
        {isOwner && currentTab === 'history' && (
          <ReproductionHistoryView reproductions={reproductions} />
        )}
      </div>
    </Card>
  );
}
