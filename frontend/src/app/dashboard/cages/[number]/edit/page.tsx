'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, Alert } from '@/shared/ui';
import { CageForm } from '@/modules/cages/components/CageForm';
import { cageService } from '@/modules/cages/services/cage.service';
import type { Cage } from '@/modules/cages/types/cage.types';

export default function CageEditPage() {
  const { number } = useParams<{ number: string }>();
  const [cage, setCage] = useState<Cage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cageService
      .getByNumber(Number(number))
      .then(setCage)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [number]);

  return (
    <Card>
      <CardHeader
        title={`Editar Jaula #${number}`}
        subtitle="Modifica los datos de la jaula seleccionada"
      />
      {error && <Alert variant="error" message={error} className="mb-4" />}
      {loading && <p className="text-base text-muted">Cargando jaula...</p>}
      {cage && <CageForm mode="edit" defaultValues={cage} cageId={cage.id} />}
    </Card>
  );
}
