'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { DewormingDashboard } from '@/modules/deworming/components/DewormingDashboard';

export default function DewormingPage() {
  return (
    <GalponGuard>
      <DewormingDashboard />
    </GalponGuard>
  );
}
