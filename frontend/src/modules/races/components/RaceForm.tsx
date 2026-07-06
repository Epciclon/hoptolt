'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button, Alert } from '@/shared/ui';
import { ImagePlaceholder } from '@/shared/ui/ImagePlaceholder';
import { raceService } from '../services/race.service';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Race } from '../types/race.types';
import { useState, useRef, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(100),
  description: z.string().min(3, 'La descripción es obligatoria.').max(255),
  imageUrl: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RaceFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Race;
  raceId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RaceForm({ mode, defaultValues, raceId, onSuccess, onCancel }: RaceFormProps) {

  const { showToast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadRaceImage, deleteRaceImage } = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (mode === 'edit' && defaultValues) {
      setImageUrl(defaultValues.imageUrl);
      setOriginalImageUrl(defaultValues.imageUrl);
    }
  }, [mode, defaultValues?.name]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? { name: defaultValues.name, description: defaultValues.description, imageUrl: defaultValues.imageUrl }
      : undefined,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadRaceImage(file);
      setImageUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir la imagen.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {

    try {
      const dataToSend = { ...values, imageUrl };
      if (mode === 'create') {
        await raceService.create(dataToSend);
        showToast('Raza registrada exitosamente.', 'success');
        reset();
        setImageUrl(undefined);
      } else {
        // En modo edición, enviar imageUrl si se subió una nueva imagen o si cambió
        const updateData: any = { description: values.description };
        if (imageUrl !== originalImageUrl) {
          updateData.imageUrl = imageUrl || null;
          if (originalImageUrl) {
            const encodedFileName = originalImageUrl.split('/').pop();
            if (encodedFileName) {
              const decodedFileName = decodeURIComponent(encodedFileName);
              await deleteRaceImage(decodedFileName).catch(console.error);
            }
          }
        }
        await raceService.update(raceId!, updateData);
        showToast('Raza actualizada exitosamente.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['races'] });
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar la raza.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {mode === 'edit' ? (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de la raza</label>
          <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-base">
            {defaultValues?.name}
          </div>
        </div>
      ) : (
        <Input
          label="Nombre de la raza"
          required
          placeholder="Ej: Nueva Zelanda"
          error={errors.name?.message}
          {...register('name')}
        />
      )}

      <Input
        label="Descripción"
        required
        placeholder="Breve descripción de la raza"
        error={errors.description?.message}
        {...register('description')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Imagen de la raza</label>
        {imageUrl ? (
          <div className="mb-3 relative w-full h-64">
            <Image
              src={imageUrl}
              alt="Imagen de la raza"
              fill
              unoptimized
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="mb-3">
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
            disabled:opacity-50"
        />
        {uploading && <p className="text-sm text-slate-500 mt-2">Subiendo imagen...</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={uploading}>
          {mode === 'create' ? 'Registrar Raza' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
