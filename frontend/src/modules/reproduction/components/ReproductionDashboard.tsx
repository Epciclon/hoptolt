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

export function ReproductionDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('reproduction', 'montas');
  const { reproductions, loading, fetchReproductions } = useReproduction();

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Reproducción" subtitle="Gestiona y monitorea los ciclos reproductivos" />
      <DashboardTabs
        tabs={[
          { id: 'montas', label: 'Fase 1: Montas', icon: <Heart size={18} /> },
          { id: 'partos', label: 'Fase 2: Gestación y Partos', icon: <Activity size={18} /> },
          { id: 'gazapos', label: 'Fase 3: Gazapos y Destetes', icon: <Activity size={18} /> },
          { id: 'history', label: 'Historial', icon: <Archive size={18} /> }
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {activeTab === 'montas' && (
          <MontasView reproductions={reproductions} onSuccess={fetchReproductions} />
        )}
        {activeTab === 'partos' && (
          <ReproductionCatalog reproductions={reproductions} onSuccess={fetchReproductions} />
        )}
        {activeTab === 'gazapos' && (
          <GazaposView reproductions={reproductions} onSuccess={fetchReproductions} />
        )}
        {activeTab === 'history' && (
          <ReproductionHistoryView reproductions={reproductions} />
        )}
      </div>
    </Card>
  );
}
