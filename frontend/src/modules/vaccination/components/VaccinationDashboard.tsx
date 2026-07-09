'use client';
import { usePersistentTab } from '@/shared/hooks/usePersistentTab';
import { DashboardTabs } from '@/shared/ui/DashboardTabs';
import { SectionMessage } from '@/shared/ui/SectionMessage';
import { Syringe, Archive } from 'lucide-react';
import { VaccinationTable } from './VaccinationTable';
import { AuditHistoryView } from '@/shared/ui';
import { vaccinationService } from '../services/vaccination.service';
import { VaccinationCatalog } from './VaccinationCatalog';
import { Card, CardHeader } from '@/shared/ui';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function VaccinationDashboard() {
  const { activeTab, handleTabChange, isInitialized } = usePersistentTab('vaccination', 'registro');
  const { user } = useAuthContext();
  const isOwner = user?.role === 'owner';

  if (!isInitialized) return null;

  return (
    <Card className="min-h-[calc(100vh-7rem)]">
      <CardHeader title="Control de Vacunación" subtitle="Registra y monitorea las vacunas aplicadas" />
      <DashboardTabs
        tabs={[
          { id: 'registro', label: 'Registro Diario', icon: <Syringe size={18} /> },
          ...(isOwner ? [{ id: 'historial', label: 'Historial', icon: <Archive size={18} /> }] : [])
        ]}
        activeTab={isOwner ? activeTab : 'registro'}
        onTabChange={handleTabChange}
      />
      
      <div className="p-6 pt-0">
        {activeTab === 'registro' || !isOwner ? (
          <>
            <SectionMessage message="En esta fase se puede registrar las vacunas aplicadas a los conejos." />
            <VaccinationCatalog />
          </>
        ) : null}
        {isOwner && activeTab === 'historial' && (
          <>
            <SectionMessage message="En esta fase se puede revisar el historial diario de vacunaciones registradas en la granja por trabajador. Selecciona un trabajador para revisar su registro de actividades diarias." />
            <AuditHistoryView 
              moduleName="vaccination"
              renderTable={(profileId, date) => <VaccinationTable profileId={profileId} date={date} />}
              fetchActiveDates={async (profileId) => {
                const data = await vaccinationService.getAll({ profileId });
                const dates = data.map(v => v.vaccinationDate.split('T')[0]);
                return Array.from(new Set(dates)).sort().reverse();
              }}
            />
          </>
        )}
      </div>
    </Card>
  );
}
