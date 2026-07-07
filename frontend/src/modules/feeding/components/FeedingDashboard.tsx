'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Utensils, Archive } from 'lucide-react';
import { FeedingTable } from './FeedingTable';
import { FeedingCatalog } from './FeedingCatalog';
import { Card, CardHeader } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function FeedingDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('feeding', 'registro');
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Alimentación" subtitle="Registra y monitorea el consumo de alimento" />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Utensils size={18} /> },
          ...(isOwner ? [{ id: 'historial', label: 'Historial', icon: <Archive size={18} /> }] : [])
        ]}
        activeTab={isOwner ? activeTab : 'registro'}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {activeTab === 'registro' || !isOwner ? (
          <>
            <SectionMessage message="En esta fase se puede registrar el alimento suministrado a las jaulas en el turno actual." />
            <FeedingCatalog />
          </>
        ) : null}
        {isOwner && activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial de alimentaciones registradas en la granja." />
            <FeedingTable />
          </>
        )}
      </div>
    </Card>
  );
}
