'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Input, Select, Button, Alert } from '@/shared/ui';
import { cageService } from '../services/cage.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Cage } from '../types/cage.types';
import { useQueryClient } from '@tanstack/react-query';

const schema = z.object({
  number: z.coerce.number({
    invalid_type_error: 'El número de jaula es obligatorio'
  }).int('El número debe ser un entero').min(1, 'El número de jaula debe ser mayor o igual a 1').max(999, 'El número de jaula debe ser menor o igual a 999'),
  type: z.enum(['engorde', 'reproducción'], {
    errorMap: () => ({ message: 'El tipo de jaula debe ser engorde o reproducción' })
  }),
  capacity: z.coerce.number({
    invalid_type_error: 'La capacidad es obligatoria'
  }).int('La capacidad debe ser un entero').min(1, 'La capacidad debe ser mayor o igual a 1').max(6, 'La capacidad debe ser menor o igual a 6'),
  status: z.enum(['operativa', 'mantenimiento'], {
    errorMap: () => ({ message: 'El estado debe ser operativa o mantenimiento' })
  }),
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
  const { activeGalpon } = useActiveGalpon();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: defaultValues?.number,
      type: defaultValues?.type ?? 'reproducción',
      capacity: defaultValues?.capacity ?? 1,
      status: (defaultValues?.status as 'operativa' | 'mantenimiento') ?? 'operativa',
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (selectedType === 'reproducción') {
      setValue('capacity', 1);
    }
  }, [selectedType, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === 'create') {
        if (!activeGalpon) {
          showToast('Debes seleccionar un galpón activo antes de crear una jaula.', 'error');
          return;
        }
        await cageService.create({ ...values, galponId: activeGalpon.id });
        showToast('Jaula registrada exitosamente.', 'success');
      } else {
        if (!activeGalpon) {
          showToast('Debes seleccionar un galpón activo antes de editar una jaula.', 'error');
          return;
        }
        await cageService.update(cageId!, { type: values.type, capacity: values.capacity, status: values.status, galponId: activeGalpon.id });
        showToast('Jaula actualizada exitosamente.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['cages'] });
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

      <Select
        label="Estado de la Jaula"
        required
        options={[
          { value: 'operativa', label: 'Operativa' },
          { value: 'mantenimiento', label: 'Mantenimiento' },
        ]}
        error={errors.status?.message}
        {...register('status')}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? 'Registrar Jaula' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
