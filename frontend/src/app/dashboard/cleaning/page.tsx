'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader } from '@/shared/ui';
import { CleaningCatalog } from '@/modules/cleaning/components/CleaningCatalog';

export default function CleaningPage() {
  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Limpieza"
          subtitle="Registra la limpieza de las jaulas con conejos asignados"
        />
        <CleaningCatalog />
      </Card>
    </GalponGuard>
  );
}
