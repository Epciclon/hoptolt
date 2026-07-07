'use client';

import { Suspense } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { ReproductionDashboard } from '@/modules/reproduction/components/ReproductionDashboard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

function ReproductionPageContent() {
  return (
    <PermissionGuard moduleName="reproduction">
      <GalponGuard>
        <ReproductionDashboard />
      </GalponGuard>
    </PermissionGuard>
  );
}

export default function ReproductionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <ReproductionPageContent />
    </Suspense>
  );
}
