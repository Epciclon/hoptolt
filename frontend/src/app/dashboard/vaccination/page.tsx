import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { Card, CardHeader } from '@/shared/ui';
import { VaccinationCatalog } from '@/modules/vaccination/components/VaccinationCatalog';

export default function VaccinationPage() {
  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Vacunación"
          subtitle="Registra la vacunación de los conejos"
        />
        <VaccinationCatalog />
      </Card>
    </GalponGuard>
  );
}
