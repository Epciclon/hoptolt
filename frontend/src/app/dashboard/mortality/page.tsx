'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { MortalityDashboard } from '@/modules/mortality/components/MortalityDashboard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function MortalityPage() {
  return (
    <PermissionGuard moduleName="mortality">
      <GalponGuard>
        <MortalityDashboard />
      </GalponGuard>
    </PermissionGuard>
  );
}
