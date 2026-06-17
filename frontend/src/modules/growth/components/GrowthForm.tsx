'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Input, Button, Alert } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
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

  const { showToast } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: FormValues) => growthService.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growths'] });
      showToast('Crecimiento registrado exitosamente.', 'success');
      onSuccess?.();
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  });

  const onSubmit = async (values: FormValues) => {

    mutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

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
