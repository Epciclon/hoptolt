'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Skull, Archive } from 'lucide-react';
import { MortalityTable } from './MortalityTable';
import { MortalityCatalog } from './MortalityCatalog';
import { Card, CardHeader } from '@/shared/ui';

export function MortalityDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('mortality', 'registro');

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Mortalidad" subtitle="Registra y monitorea las bajas en el galpón" />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Skull size={18} /> },
          { id: 'historial', label: 'Historial', icon: <Archive size={18} /> }
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="p-6 pt-0">
        {activeTab === 'registro' && (
          <>
            <SectionMessage message="En esta fase se puede registrar las bajas o mortalidades ocurridas." />
            <MortalityCatalog />
          </>
        )}
        {activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial de mortalidades." />
            <MortalityTable />
          </>
        )}
      </div>
    </Card>
  );
}
