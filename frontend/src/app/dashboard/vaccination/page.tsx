'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader } from '@/shared/ui';
import { VaccinationCatalog } from '@/modules/vaccination/components/VaccinationCatalog';

export default function VaccinationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Vacunación"
          subtitle="Registra la vacunación de los conejos"
        />
        <VaccinationCatalog key={refreshKey} onSuccess={handleSuccess} />
      </Card>
    </GalponGuard>
  );
}
