import { Card, CardHeader } from '@/shared/ui';
import { CageForm } from '@/modules/cages/components/CageForm';

export default function CageRegisterPage() {
  return (
    <Card>
      <CardHeader
        title="Registrar Nueva Jaula"
        subtitle="Completa los datos para agregar una jaula al sistema"
      />
      <CageForm mode="create" />
    </Card>
  );
}
