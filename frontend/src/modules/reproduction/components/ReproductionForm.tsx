'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Input, Button } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { useReproduction } from '../hooks/useReproduction';
import type { Reproduction } from '../types/reproduction.types';
import { rabbitService } from '@/modules/rabbits/services/rabbit.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import { Heart } from 'lucide-react';

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
  const { updateReproduction } = useReproduction();
  const [femaleRabbit, setFemaleRabbit] = useState<Rabbit | null>(null);
  const [maleRabbit, setMaleRabbit] = useState<Rabbit | null>(null);
  const [loadingRabbits, setLoadingRabbits] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editingReproduction ? {
      femaleId: editingReproduction.femaleId,
      maleId: editingReproduction.maleId || 0,
      mountDate: editingReproduction.mountDate.split('T')[0],
    } : undefined,
  });

  useEffect(() => {
    const fetchRabbitDetails = async () => {
      if (editingReproduction) {
        setLoadingRabbits(true);
        try {
          const female = await rabbitService.getById(editingReproduction.femaleId);
          setFemaleRabbit(female);
          if (editingReproduction.maleId) {
            const male = await rabbitService.getById(editingReproduction.maleId);
            setMaleRabbit(male);
          }
        } catch (err) {
          console.error('Error al cargar detalles de la pareja:', err);
          showToast('Error al cargar detalles de la pareja', 'error');
        } finally {
          setLoadingRabbits(false);
        }
      }
    };
    fetchRabbitDetails();
  }, [editingReproduction]);


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


  if (loadingRabbits) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!editingReproduction) {
    return <p className="text-center text-muted py-6">No hay datos de monta para editar.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Visualización de la Pareja */}
      <div className="flex items-center justify-center gap-6 p-5 border border-strong/80 rounded-xl">
        {/* Hembra */}
        <div className="flex flex-col items-center gap-2 text-center w-28">
          {femaleRabbit?.imageUrl ? (
            <img src={femaleRabbit.imageUrl} alt={femaleRabbit.code} className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-primary-100 dark:border-primary-900/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-muted font-semibold text-xs border border-slate-300 dark:border-slate-700">
              Sin foto
            </div>
          )}
          <div>
            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] font-semibold rounded-full">Hembra</span>
            <h5 className="font-bold text-main text-sm mt-1">{editingReproduction.femaleCode}</h5>
            {editingReproduction.femaleName && <p className="text-xs text-muted truncate max-w-[110px]">{editingReproduction.femaleName}</p>}
          </div>
        </div>

        {/* Conector */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm border border-violet-200 dark:border-violet-500/30">
            <Heart size={20} className="animate-pulse text-violet-500 dark:text-violet-400" fill="currentColor" />
          </div>
          <span className="text-[10px] text-theme-faint mt-1 uppercase font-semibold tracking-wider">Pareja</span>
        </div>

        {/* Macho */}
        <div className="flex flex-col items-center gap-2 text-center w-28">
          {maleRabbit?.imageUrl ? (
            <img src={maleRabbit.imageUrl} alt={maleRabbit.code} className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-violet-100 dark:border-violet-900/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-muted font-semibold text-xs border border-slate-300 dark:border-slate-700">
              Sin foto
            </div>
          )}
          <div>
            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-[10px] font-semibold rounded-full">Macho</span>
            <h5 className="font-bold text-main text-sm mt-1">{editingReproduction.maleCode || 'N/A'}</h5>
            {editingReproduction.maleName && <p className="text-xs text-muted truncate max-w-[110px]">{editingReproduction.maleName}</p>}
          </div>
        </div>
      </div>

      <Input
        label="Fecha de Monta"
        type="date"
        required
        error={errors.mountDate?.message}
        {...register('mountDate')}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting} className="flex-1">
          Actualizar Monta
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
