'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { MortalityDashboard } from '@/modules/mortality/components/MortalityDashboard';

export default function MortalityPage() {
  return (
    <GalponGuard>
      <MortalityDashboard />
    </GalponGuard>
  );
}
