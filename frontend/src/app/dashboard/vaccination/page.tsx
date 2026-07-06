'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { VaccinationDashboard } from '@/modules/vaccination/components/VaccinationDashboard';

export default function VaccinationPage() {
  return (
    <GalponGuard>
      <VaccinationDashboard />
    </GalponGuard>
  );
}
