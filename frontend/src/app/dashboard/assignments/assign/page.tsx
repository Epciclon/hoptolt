import { Card, CardHeader } from '@/shared/ui';
import { AssignRabbitForm } from '@/modules/assignments/components/AssignRabbitForm';

export default function AssignRabbitPage() {
  return (
    <Card>
      <CardHeader
        title="Asignar Conejo a Jaula"
        subtitle="Selecciona una jaula y el conejo a asignar"
      />
      <AssignRabbitForm />
    </Card>
  );
}
