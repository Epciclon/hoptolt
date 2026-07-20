'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Sparkles, Archive } from 'lucide-react';
import { CleaningTable } from './CleaningTable';
import { cleaningService } from '../services/cleaning.service';
import { CleaningCatalog } from './CleaningCatalog';
import { Card, CardHeader, AuditHistoryView } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function CleaningDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('cleaning', 'registro');
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader 
        title="Limpieza de Jaulas" 
        subtitle="Marca las jaulas que ya limpiaste para llevar un buen control de higiene" 
        tutorialUrl="https://youtu.be/LXKorxIwyHo" 
      />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Sparkles size={18} /> },
          ...(isOwner ? [{ id: 'historial', label: 'Historial', icon: <Archive size={18} /> }] : [])
        ]}
        activeTab={isOwner ? activeTab : 'registro'}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {activeTab === 'registro' || !isOwner ? (
          <>
            <SectionMessage message="En esta fase se puede registrar las limpiezas realizadas en las jaulas." />
            <CleaningCatalog />
          </>
        ) : null}
        {isOwner && activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial diario de limpiezas registradas en la granja por trabajador. Selecciona un trabajador para revisar su registro de actividades diarias." />
            <AuditHistoryView 
              moduleName="cleaning"
              renderTable={(profileId, date) => <CleaningTable profileId={profileId} date={date} />}
              fetchActiveDates={async (profileId) => {
                const data = await cleaningService.getAll({ profileId });
                const dates = data.map(c => c.cleaningDate.split('T')[0]);
                return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
              }}
            />
          </>
        )}
      </div>
    </Card>
  );
}
