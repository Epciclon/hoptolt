'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Skull, Archive } from 'lucide-react';
import { MortalityTable } from './MortalityTable';
import { mortalityService } from '../services/mortality.service';
import { MortalityCatalog } from './MortalityCatalog';
import { Card, CardHeader, AuditHistoryView } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function MortalityDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('mortality', 'registro');
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Bajas y Mortalidad" subtitle="Registra si algún conejo fallece para llevar tus estadísticas al día" />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Skull size={18} /> },
          ...(isOwner ? [{ id: 'historial', label: 'Historial', icon: <Archive size={18} /> }] : [])
        ]}
        activeTab={isOwner ? activeTab : 'registro'}
        onTabChange={handleTabChange}
      />

      <div className="p-6 pt-0">
        {activeTab === 'registro' || !isOwner ? (
          <>
            <SectionMessage message="En esta fase se puede registrar las bajas o mortalidades ocurridas." />
            <MortalityCatalog />
          </>
        ) : null}
        {isOwner && activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial diario de mortalidades registradas en la granja por trabajador. Selecciona un trabajador para revisar su registro de actividades diarias." />
            <AuditHistoryView 
              moduleName="mortality"
              renderTable={(profileId, date) => <MortalityTable profileId={profileId} date={date} />}
              fetchActiveDates={async (profileId) => {
                const data = await mortalityService.getAll({ profileId });
                const dates = data.map(m => m.deathDate.split('T')[0]);
                return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
              }}
            />
          </>
        )}
      </div>
    </Card>
  );
}
