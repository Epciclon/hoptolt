import { Card, CardHeader } from '@/shared/ui';
import { RaceForm } from '@/modules/races/components/RaceForm';

export default function RaceRegisterPage() {
  return (
    <Card>
      <CardHeader
        title="Registrar Nueva Raza"
        subtitle="Ingresa el nombre y descripción de la raza"
      />
      <RaceForm mode="create" />
    </Card>
  );
}
