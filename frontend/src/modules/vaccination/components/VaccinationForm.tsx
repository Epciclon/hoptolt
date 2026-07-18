'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button, RabbitMultiSelectField } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { vaccinationService } from '../services/vaccination.service';

const VACCINES = ['Mixomatosis', 'VHD', 'Neumonía', 'Coccidiosis'];

const schema = z.object({
  rabbitCodes: z.array(z.string()).min(1, 'Selecciona al menos un conejo'),
  vaccines: z.array(z.string()).min(1, 'Selecciona al menos una vacuna'),
});

type FormValues = z.infer<typeof schema>;

interface VaccinationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VaccinationForm({ onSuccess, onCancel }: Readonly<VaccinationFormProps>) {

  const { showToast } = useToast();
  const [selectedRabbits, setSelectedRabbits] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rabbitCodes: [],
      vaccines: [],
    },
  });

  const onSubmit = async (values: FormValues) => {

    try {
      await vaccinationService.create({
        ...values,
        rabbitIds: selectedRabbits.map(Number),
      });
      showToast('Vacunación registrada exitosamente.', 'success');
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

      <div>
        <span className="block text-sm font-medium text-muted mb-2">Vacunas</span>
        <div className="space-y-2">
          {VACCINES.map(vaccine => (
            <label key={vaccine} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={vaccine}
                {...register('vaccines')}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-main">{vaccine}</span>
            </label>
          ))}
        </div>
        {errors.vaccines && <p className="text-sm text-red-600 mt-1">{errors.vaccines.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Registrar Vacunación
        </Button>
      </div>
    </form>
  );
}
