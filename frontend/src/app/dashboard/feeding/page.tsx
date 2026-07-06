'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { FeedingDashboard } from '@/modules/feeding/components/FeedingDashboard';

export default function FeedingPage() {
  return (
    <GalponGuard>
      <FeedingDashboard />
    </GalponGuard>
  );
}
