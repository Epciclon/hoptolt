'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Input, Button, Alert } from '@/shared/ui';
import { growthService } from '../services/growth.service';

const schema = z.object({
  rabbitCode: z.string().min(1, 'El código del conejo es obligatorio'),
  weight: z.coerce.number().min(0.1).max(4.5),
});

type FormValues = z.infer<typeof schema>;

interface GrowthFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GrowthForm({ onSuccess, onCancel }: GrowthFormProps) {
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    setSuccessMsg('');
    try {
      await growthService.create(values);
      setSuccessMsg('Crecimiento registrado exitosamente.');
      setTimeout(() => onSuccess?.(), 1000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="error" message={serverError} onClose={() => setServerError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} />}

      <Input
        label="Código del Conejo"
        required
        placeholder="Ej: R001"
        error={errors.rabbitCode?.message}
        {...register('rabbitCode')}
      />

      <Input
        label="Peso (kg)"
        type="number"
        step="0.1"
        required
        placeholder="Ej: 2.5"
        error={errors.weight?.message}
        {...register('weight')}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          Registrar Crecimiento
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
