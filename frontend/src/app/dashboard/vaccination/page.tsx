'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { VaccinationDashboard } from '@/modules/vaccination/components/VaccinationDashboard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function VaccinationPage() {
  return (
    <PermissionGuard moduleName="vaccination">
      <GalponGuard>
        <VaccinationDashboard />
      </GalponGuard>
    </PermissionGuard>
  );
}
