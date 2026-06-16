'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Input, Select, Button, Alert } from '@/shared/ui';
import { cageService } from '../services/cage.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { Cage } from '../types/cage.types';

const schema = z.object({
  number: z.coerce.number().int().min(1).max(999),
  type: z.enum(['engorde', 'reproducción']),
  capacity: z.coerce.number().int().min(1).max(6),
}).refine(
  (data) => !(data.type === 'reproducción' && data.capacity !== 1),
  { message: 'La capacidad para reproducción debe ser 1.', path: ['capacity'] },
).refine(
  (data) => !(data.type === 'engorde' && (data.capacity < 1 || data.capacity > 6)),
  { message: 'La capacidad para engorde debe ser entre 1 y 6.', path: ['capacity'] },
);

type FormValues = z.infer<typeof schema>;

interface CageFormProps {
  defaultValues?: Partial<Cage>;
  cageId?: number;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CageForm({ defaultValues, cageId, mode, onSuccess, onCancel }: CageFormProps) {
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { activeGalpon } = useActiveGalpon();

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: defaultValues?.number,
      type: defaultValues?.type ?? 'reproducción',
      capacity: defaultValues?.capacity ?? 1,
    },
  });

  const selectedType = watch('type');

  // Auto-set capacity to 1 when reproduction is selected
  useEffect(() => {
    if (selectedType === 'reproducción') {
      setValue('capacity', 1);
    }
  }, [selectedType, setValue]);

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    setSuccessMsg('');
    try {
      if (mode === 'create') {
        if (!activeGalpon) {
          setServerError('Debes seleccionar un galpón activo antes de crear una jaula.');
          return;
        }
        await cageService.create({ ...values, galponId: activeGalpon.id });
        setSuccessMsg('Jaula registrada exitosamente.');
      } else {
        if (!activeGalpon) {
          setServerError('Debes seleccionar un galpón activo antes de editar una jaula.');
          return;
        }
        await cageService.update(cageId!, { type: values.type, capacity: values.capacity, galponId: activeGalpon.id });
        setSuccessMsg('Jaula actualizada exitosamente.');
      }
      setTimeout(() => onSuccess?.(), 1000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="error" message={serverError} onClose={() => setServerError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} />}

      {mode === 'edit' ? (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Número de Jaula</label>
          <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-base">
            #{defaultValues?.number}
          </div>
        </div>
      ) : (
        <Input
          label="Número de Jaula"
          type="number"
          required
          placeholder="Ej: 1"
          error={errors.number?.message}
          {...register('number')}
        />
      )}

      <Select
        label="Tipo de Jaula"
        required
        options={[
          { value: 'reproducción', label: 'Reproducción' },
          { value: 'engorde', label: 'Engorde' },
        ]}
        error={errors.type?.message}
        {...register('type')}
      />

      <Input
        label="Capacidad"
        type="number"
        required
        placeholder="Máx. 6 para engorde, 1 para reproducción"
        error={errors.capacity?.message}
        disabled={selectedType === 'reproducción'}
        {...register('capacity')}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? 'Registrar Jaula' : 'Guardar Cambios'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
