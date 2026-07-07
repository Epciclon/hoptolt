'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { CleaningDashboard } from '@/modules/cleaning/components/CleaningDashboard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function CleaningPage() {
  return (
    <PermissionGuard moduleName="cleaning">
      <GalponGuard>
        <CleaningDashboard />
      </GalponGuard>
    </PermissionGuard>
  );
}
