'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button, RabbitMultiSelectField } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { dewormingService } from '../services/deworming.service';

const schema = z.object({
  rabbitCodes: z.array(z.string()).min(1, 'Selecciona al menos un conejo'),
});

type FormValues = z.infer<typeof schema>;

interface DewormingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DewormingForm({ onSuccess, onCancel }: Readonly<DewormingFormProps>) {

  const { showToast } = useToast();
  const [selectedRabbits, setSelectedRabbits] = useState<string[]>([]);

  const { handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rabbitCodes: [],
    },
  });

  const onSubmit = async () => {

    if (selectedRabbits.length === 0) {
      showToast('Selecciona al menos un conejo', 'error');
      return;
    }
    try {
      await dewormingService.create({ rabbitIds: selectedRabbits.map(Number) });
      showToast('Desparasitación registrada exitosamente.', 'success');
      setSelectedRabbits([]);
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

      <RabbitMultiSelectField
        selectedRabbits={selectedRabbits}
        onChange={setSelectedRabbits}
        error={errors.rabbitCodes?.message}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Registrar Desparasitación
        </Button>
      </div>
    </form>
  );
}
