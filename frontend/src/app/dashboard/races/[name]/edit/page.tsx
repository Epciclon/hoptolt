'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, Alert } from '@/shared/ui';
import { RaceForm } from '@/modules/races/components/RaceForm';
import { raceService } from '@/modules/races/services/race.service';
import type { Race } from '@/modules/races/types/race.types';

export default function RaceEditPage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const decodedName = decodeURIComponent(name);
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    raceService
      .getByName(decodedName)
      .then(setRace)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [decodedName]);

  const handleSuccess = () => {
    router.push('/dashboard/races');
  };

  const handleCancel = () => {
    router.push('/dashboard/races');
  };

  return (
    <Card>
      <CardHeader
        title={`Editar Raza: ${decodedName}`}
        subtitle="Modifica la descripción de la raza"
      />
      {error && <Alert variant="error" message={error} className="mb-4" />}
      {loading && <p className="text-base text-slate-500">Cargando raza...</p>}
      {race && <RaceForm mode="edit" defaultValues={race} raceId={race.id} onSuccess={handleSuccess} onCancel={handleCancel} />}
    </Card>
  );
}
