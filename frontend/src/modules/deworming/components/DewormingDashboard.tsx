'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Pill, Archive } from 'lucide-react';
import { DewormingTable } from './DewormingTable';
import { AuditHistoryView } from '@/shared/ui';
import { dewormingService } from '../services/deworming.service';
import { DewormingCatalog } from './DewormingCatalog';
import { Card, CardHeader } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function DewormingDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('deworming', 'registro');
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Desparasitación" subtitle="Registra y monitorea las desparasitaciones" />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Pill size={18} /> },
          ...(isOwner ? [{ id: 'historial', label: 'Historial', icon: <Archive size={18} /> }] : [])
        ]}
        activeTab={isOwner ? activeTab : 'registro'}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {activeTab === 'registro' || !isOwner ? (
          <>
            <SectionMessage message="En esta fase se puede registrar las desparasitaciones aplicadas a los conejos." />
            <DewormingCatalog />
          </>
        ) : null}
        {isOwner && activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial diario de desparasitaciones registradas en la granja por trabajador. Selecciona un trabajador para revisar su registro de actividades diarias." />
            <AuditHistoryView 
              moduleName="deworming"
              renderTable={(profileId, date) => <DewormingTable profileId={profileId} date={date} />}
              fetchActiveDates={async (profileId) => {
                const data = await dewormingService.getAll({ profileId });
                const dates = data.map(d => d.dewormingDate.split('T')[0]);
                return Array.from(new Set(dates)).sort().reverse();
              }}
            />
          </>
        )}
      </div>
    </Card>
  );
}
