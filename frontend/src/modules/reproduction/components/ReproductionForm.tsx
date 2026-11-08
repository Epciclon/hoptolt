'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useReproduction } from '../hooks/useReproduction';
import type { Reproduction } from '../types/reproduction.types';

const schema = z.object({
  femaleId: z.number({ required_error: 'La coneja es obligatoria' }),
  maleId: z.number({ required_error: 'El macho es obligatorio' }),
  mountDate: z.string().min(1, 'La fecha de monta es obligatoria'),
});

type FormValues = z.infer<typeof schema>;

interface ReproductionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingReproduction?: Reproduction;
}

export function ReproductionForm({ onSuccess, onCancel, editingReproduction }: Readonly<ReproductionFormProps>) {
  const { showToast } = useToast();
  const { updateReproduction } = useReproduction({ enabled: false });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editingReproduction ? {
      femaleId: editingReproduction.femaleId,
      maleId: editingReproduction.maleId || 0,
      mountDate: editingReproduction.mountDate.split('T')[0],
    } : undefined,
  });

  const onSubmit = async (values: FormValues) => {
    if (!editingReproduction) return;
    try {
      await updateReproduction(editingReproduction.id, {
        mountDate: values.mountDate,
      });
      showToast('Monta actualizada exitosamente.', 'success');
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  };

  if (!editingReproduction) {
    return <p className="text-center text-muted py-6">No hay datos de monta para editar.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Actualiza la fecha en que se realizó la monta para recalcular la fecha estimada de parto.
      </p>

      <Input
        label="Fecha de Monta"
        type="date"
        required
        max={new Date().toISOString().split('T')[0]}
        error={errors.mountDate?.message}
        {...register('mountDate')}
      />

      <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:flex-1" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} className="w-full sm:flex-1">
          Actualizar Monta
        </Button>
      </div>
    </form>
  );
}
