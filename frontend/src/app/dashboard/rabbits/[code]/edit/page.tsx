'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, Alert } from '@/shared/ui';
import { RabbitForm } from '@/modules/rabbits/components/RabbitForm';
import { rabbitService } from '@/modules/rabbits/services/rabbit.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

export default function RabbitEditPage() {
  const { id } = useParams<{ id: string }>();
  const rabbitId = Number.parseInt(id);
  const [rabbit, setRabbit] = useState<Rabbit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    rabbitService
      .getById(rabbitId)
      .then(setRabbit)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [rabbitId]);

  return (
    <Card>
      <CardHeader
        title={`Editar Conejo: ${rabbit?.code}`}
        subtitle="Modifica los datos del conejo"
      />
      {error && <Alert variant="error" message={error} className="mb-4" />}
      {loading && <p className="text-base text-slate-500">Cargando conejo...</p>}
      {rabbit && <RabbitForm mode="edit" defaultValues={rabbit} rabbitId={rabbit.id} />}
    </Card>
  );
}
