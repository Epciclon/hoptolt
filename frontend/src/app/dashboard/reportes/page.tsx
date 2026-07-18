'use client';

import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { useToast } from '@/shared/contexts/ToastContext';
import { ReportGenerator } from '@/modules/reports/components/ReportGenerator';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { Alert } from '@/shared/ui';

export default function ReportesPage() {
    const { activeGalpon } = useActiveGalpon();
    const { showToast } = useToast();
    const { user } = useAuthContext();
    const isOwner = user?.role === 'owner';

    if (!isOwner) {
        return (
            <div className="p-4">
                <div className="max-w-md mx-auto">
                    <Alert variant="error" message="Acceso Denegado" />
                    <p className="text-muted text-sm mt-4">
                        Solo el propietario del criadero puede acceder a los reportes y métricas.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <GalponGuard>
            {activeGalpon && (
                <ReportGenerator 
                    galponId={activeGalpon.id} 
                    galpon={activeGalpon}
                    onToast={showToast} 
                />
            )}
        </GalponGuard>
    );
}
