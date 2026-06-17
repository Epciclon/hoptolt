import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader } from '@/shared/ui';
import { DewormingCatalog } from '@/modules/deworming/components/DewormingCatalog';

export default function DewormingPage() {
  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Desparasitación"
          subtitle="Registra la desparasitación de los conejos"
        />
        <DewormingCatalog />
      </Card>
    </GalponGuard>
  );
}
