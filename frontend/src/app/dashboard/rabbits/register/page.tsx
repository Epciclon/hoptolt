import { Card, CardHeader } from '@/shared/ui';
import { RabbitForm } from '@/modules/rabbits/components/RabbitForm';

export default function RabbitRegisterPage() {
  return (
    <Card>
      <CardHeader
        title="Registrar Nuevo Conejo"
        subtitle="Completa los datos del conejo a registrar"
      />
      <RabbitForm mode="create" />
    </Card>
  );
}
