'use client';

import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader } from '@/shared/ui';
import { FeedingCatalog } from '@/modules/feeding/components/FeedingCatalog';

export default function FeedingPage() {
  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Alimentación"
          subtitle="Registra la alimentación de los conejos"
        />
        <FeedingCatalog />
      </Card>
    </GalponGuard>
  );
}
