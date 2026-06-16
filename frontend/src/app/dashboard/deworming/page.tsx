'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader } from '@/shared/ui';
import { DewormingCatalog } from '@/modules/deworming/components/DewormingCatalog';

export default function DewormingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Desparasitación"
          subtitle="Registra la desparasitación de los conejos"
        />
        <DewormingCatalog key={refreshKey} onSuccess={handleSuccess} />
      </Card>
    </GalponGuard>
  );
}
