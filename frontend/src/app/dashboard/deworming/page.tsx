'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { DewormingDashboard } from '@/modules/deworming/components/DewormingDashboard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function DewormingPage() {
  return (
    <PermissionGuard moduleName="deworming">
      <GalponGuard>
        <DewormingDashboard />
      </GalponGuard>
    </PermissionGuard>
  );
}
