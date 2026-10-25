'use client';

import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { useToast } from '@/shared/contexts/ToastContext';
import { ReportGenerator } from '@/modules/reports/components/ReportGenerator';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { PermissionGuard } from '@/shared/layout/PermissionGuard';

export default function ReportesPage() {
    const { activeGalpon } = useActiveGalpon();
    const { showToast } = useToast();

    return (
        <PermissionGuard moduleName="reports">
            <GalponGuard>
                {activeGalpon && (
                    <ReportGenerator 
                        galponId={activeGalpon.id} 
                        galpon={activeGalpon}
                        onToast={showToast} 
                    />
                )}
            </GalponGuard>
        </PermissionGuard>
    );
}
