'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Pill, Archive } from 'lucide-react';
import { DewormingTable } from './DewormingTable';
import { DewormingCatalog } from './DewormingCatalog';
import { Card, CardHeader } from '@/shared/ui';

export function DewormingDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('deworming', 'registro');

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Desparasitación" subtitle="Registra y monitorea las desparasitaciones" />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Pill size={18} /> },
          { id: 'historial', label: 'Historial', icon: <Archive size={18} /> }
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {activeTab === 'registro' && (
          <>
            <SectionMessage message="En esta fase se puede registrar las desparasitaciones aplicadas a los conejos." />
            <DewormingCatalog />
          </>
        )}
        {activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial de desparasitaciones." />
            <DewormingTable />
          </>
        )}
      </div>
    </Card>
  );
}
