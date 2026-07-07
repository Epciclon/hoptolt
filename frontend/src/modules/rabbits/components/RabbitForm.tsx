'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Button, Alert } from '@/shared/ui';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { rabbitService } from '../services/rabbit.service';
import { raceService } from '@/modules/races/services/race.service';
import type { Rabbit } from '../types/rabbit.types';
import type { Race } from '@/modules/races/types/race.types';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { ImagePlaceholder } from '@/shared/ui/ImagePlaceholder';
import Image from 'next/image';
import { useRef } from 'react';
import { calculateEstimatedWeight, calculateAgeMonths } from '@/modules/growth/utils/growthEstimations';

const schema = z.object({
  race: z.string().min(1, 'Selecciona una raza.'),
  code: z.string().optional(),
  name: z.string().min(1, 'El nombre es obligatorio.').max(50, 'Máximo 50 caracteres.'),
  sex: z.enum(['macho', 'hembra'], { required_error: 'Selecciona el género.' }),
  birthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria.'),
  weight: z.coerce.number().min(0.01).max(4.5, 'Máximo 4.5 kg.'),
  purpose: z.enum(['Reproducción', 'Engorde'], { required_error: 'Selecciona el propósito.' }),
});

type FormValues = z.infer<typeof schema>;

interface RabbitFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<Rabbit>;
  rabbitId?: number;
  onSuccess?: (rabbit?: Rabbit) => void;
  onCancel?: () => void;
  hideCancel?: boolean;
  readOnlyRace?: boolean;
}



export function RabbitForm({ mode, defaultValues, rabbitId, onSuccess, onCancel, hideCancel, readOnlyRace }: RabbitFormProps) {

  const [races, setRaces] = useState<Race[]>([]);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadRabbitImage, deleteRabbitImage } = useSupabase();
  const [suggestingName, setSuggestingName] = useState(false);

  useEffect(() => {
    raceService.getAll().then(res => setRaces(res.races || [])).catch(() => {});
    if (mode === 'edit' && defaultValues) {
      setImageUrl(defaultValues.imageUrl);
      setOriginalImageUrl(defaultValues.imageUrl);
    }
  }, [mode, defaultValues]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ? {
      ...defaultValues,
      birthDate: defaultValues.birthDate ? new Date(defaultValues.birthDate).toISOString().split('T')[0] : '',
    } : undefined,
  });

  const selectedSex = watch('sex');
  const selectedRace = watch('race');
  const selectedPurpose = watch('purpose');
  const selectedBirthDate = watch('birthDate');

  useEffect(() => {
    if (mode === 'create' && selectedPurpose && selectedBirthDate) {
      const age = calculateAgeMonths(selectedBirthDate);
      const estWeight = calculateEstimatedWeight(selectedPurpose, age);
      setValue('weight', estWeight, { shouldValidate: true });
    }
  }, [selectedPurpose, selectedBirthDate, mode, setValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadRabbitImage(file);
      setImageUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir la imagen.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {

    try {
      if (mode === 'create') {
        const payload = {
          race: values.race,
          name: values.name,
          sex: values.sex,
          birthDate: values.birthDate,
          weight: parseFloat(String(values.weight)),
          purpose: values.purpose,
          imageUrl: imageUrl || undefined,
        };
        const createdRabbit = await rabbitService.create(payload);
        showToast('Conejo registrado exitosamente.', 'success');
        reset();
        setImageUrl(undefined);
        queryClient.invalidateQueries({ queryKey: ['rabbits'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
        onSuccess?.(createdRabbit);
      } else {
        const updateData: any = {
          name: values.name,
          sex: values.sex,
          birthDate: values.birthDate,
          weight: values.weight,
          purpose: values.purpose,
        };
        if (imageUrl !== originalImageUrl) {
          if (originalImageUrl) {
            const encodedFileName = originalImageUrl.split('/').pop();
            if (encodedFileName) {
              const decodedFileName = decodeURIComponent(encodedFileName);
              await deleteRabbitImage(decodedFileName).catch(console.error);
            }
          }
          updateData.imageUrl = imageUrl || null;
        }
        await rabbitService.update(rabbitId!, updateData);
        showToast('Conejo actualizado exitosamente.', 'success');
        queryClient.invalidateQueries({ queryKey: ['rabbits'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
        queryClient.invalidateQueries({ queryKey: ['rabbitGrowth', rabbitId] });
        onSuccess?.();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar el conejo.', 'error');
    }
  };

  const suggestName = async () => {
    if (!selectedSex) return;
    setSuggestingName(true);
    try {
      const name = await rabbitService.suggestName(selectedSex);
      setValue('name', name, { shouldValidate: true });
    } catch (err) {
      showToast('No se pudo generar el nombre.', 'error');
    } finally {
      setSuggestingName(false);
    }
  };

  const raceOptions = races.map((r) => ({ value: r.name, label: r.name }));
  const sexOptions = [
    { value: 'macho', label: 'Macho' },
    { value: 'hembra', label: 'Hembra' },
  ];
  const purposeOptions = [
    { value: 'Reproducción', label: 'Reproducción' },
    { value: 'Engorde', label: 'Engorde' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {mode === 'edit' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Código</label>
            <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold">
              {defaultValues?.code}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Raza</label>
            <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              {defaultValues?.race}
            </div>
          </div>
        </div>
      ) : (
        <Select
          label="Raza"
          required
          options={raceOptions}
          placeholder="Selecciona una raza"
          error={errors.race?.message}
          value={selectedRace || ''}
          onChange={(e) => setValue('race', e.target.value)}
          disabled={readOnlyRace}
        />
      )}

      <Select
        label="Género"
        required
        options={sexOptions}
        placeholder="Selecciona el género"
        error={errors.sex?.message}
        value={selectedSex || ''}
        onChange={(e) => setValue('sex', e.target.value as 'macho' | 'hembra')}
      />

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Nombre del conejo"
            required
            placeholder="Ej: Pipo, Luna"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          icon={<Sparkles size={16} />}
          onClick={suggestName}
          disabled={!selectedSex || suggestingName}
          loading={suggestingName}
          title="Sugerir nombre según el género"
          className="mb-[1px]"
        >
          Sugerir
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Fecha de nacimiento"
          type="date"
          required
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <Select
          label="Propósito"
          required
          options={purposeOptions}
          placeholder="Selecciona el propósito"
          error={errors.purpose?.message}
          value={selectedPurpose || ''}
          onChange={(e) => setValue('purpose', e.target.value as 'Reproducción' | 'Engorde')}
        />
      </div>

      <Input
        label="Peso (kg)"
        type="number"
        step="0.01"
        required
        min={0.01}
        max={4.5}
        error={errors.weight?.message}
        {...register('weight')}
      />

      <div className="border-t border-slate-100 pt-3 mt-1">
        <label className="block text-sm font-medium text-slate-600 mb-2">Fotografía del conejo</label>
        {imageUrl ? (
          <div className="mb-2 relative w-full h-32 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt="Foto del conejo"
              fill
              unoptimized
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="mb-2">
            <ImagePlaceholder size="lg" />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploading}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 transition-colors"
        />
        {uploading && <p className="text-sm text-slate-500 mt-2">Subiendo imagen, por favor espera...</p>}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
        {!hideCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || uploading}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || uploading}
        >
          {isSubmitting ? 'Guardando...' : (mode === 'create' ? 'Registrar Conejo' : 'Guardar Cambios')}
        </Button>
      </div>
    </form>
  );
}
