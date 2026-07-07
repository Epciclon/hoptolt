'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { FeedingDashboard } from '@/modules/feeding/components/FeedingDashboard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function FeedingPage() {
  return (
    <PermissionGuard moduleName="feeding">
      <GalponGuard>
        <FeedingDashboard />
      </GalponGuard>
    </PermissionGuard>
  );
}
