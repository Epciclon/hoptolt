'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { CleaningDashboard } from '@/modules/cleaning/components/CleaningDashboard';

export default function CleaningPage() {
  return (
    <GalponGuard>
      <CleaningDashboard />
    </GalponGuard>
  );
}
