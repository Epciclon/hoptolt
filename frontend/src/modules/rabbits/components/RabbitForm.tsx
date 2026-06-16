'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Button, Alert } from '@/shared/ui';
import { Sparkles } from 'lucide-react';
import { rabbitService } from '../services/rabbit.service';
import { raceService } from '@/modules/races/services/race.service';
import type { Rabbit } from '../types/rabbit.types';
import type { Race } from '@/modules/races/types/race.types';

const schema = z.object({
  race: z.string().min(1, 'Selecciona una raza.'),
  code: z.string().optional(),
  name: z.string().min(1, 'El nombre es obligatorio.').max(50, 'Máximo 50 caracteres.'),
  sex: z.enum(['macho', 'hembra'], { required_error: 'Selecciona el sexo.' }),
  birthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria.'),
  weight: z.coerce.number().min(0.1).max(4.5, 'Máximo 4.5 kg.'),
  purpose: z.enum(['Reproducción', 'Engorde'], { required_error: 'Selecciona el propósito.' }),
});

type FormValues = z.infer<typeof schema>;

interface RabbitFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Rabbit;
  rabbitId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RABBIT_NAMES_MALE = ['Conejito', 'Peludo', 'Saltarín', 'Orejas', 'Bigotes', 'Rápido', 'Aventurero', 'Travieso', 'Valiente', 'Explorador'];
const RABBIT_NAMES_FEMALE = ['Conejita', 'Peluda', 'Saltarina', 'Orejotas', 'Bigotuda', 'Rápida', 'Aventurera', 'Traviesa', 'Valiente', 'Exploradora'];

export function RabbitForm({ mode, defaultValues, rabbitId, onSuccess, onCancel }: RabbitFormProps) {
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const [races, setRaces] = useState<Race[]>([]);

  useEffect(() => {
    raceService.getAll().then(setRaces).catch(() => {});
  }, []);

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

  const onSubmit = async (values: FormValues) => {
    setApiError('');
    setSuccess('');
    try {
      if (mode === 'create') {
        const payload = {
          race: values.race,
          name: values.name,
          sex: values.sex,
          birthDate: values.birthDate,
          weight: parseFloat(String(values.weight)),
          purpose: values.purpose,
        };
        await rabbitService.create(payload);
        setSuccess('Conejo registrado exitosamente.');
        reset();
      } else {
        await rabbitService.update(rabbitId!, {
          name: values.name,
          sex: values.sex,
          birthDate: values.birthDate,
          weight: values.weight,
          purpose: values.purpose,
        });
        setSuccess('Conejo actualizado exitosamente.');
      }
      setTimeout(() => onSuccess?.(), 1000);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al guardar el conejo.');
    }
  };

  const suggestName = () => {
    const names = selectedSex === 'macho' ? RABBIT_NAMES_MALE : RABBIT_NAMES_FEMALE;
    const randomName = names[Math.floor(Math.random() * names.length)];
    setValue('name', randomName);
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {success && <Alert variant="success" message={success} onClose={() => setSuccess('')} />}
      {apiError && <Alert variant="error" message={apiError} onClose={() => setApiError('')} />}

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
        />
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Nombre del conejo"
            required
            placeholder="Ej: Conejito"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Sparkles size={16} />}
          onClick={suggestName}
          disabled={!selectedSex}
          title="Sugerir nombre según el sexo"
        >
          Sugerir
        </Button>
      </div>

      <Select
        label="Sexo"
        required
        options={sexOptions}
        placeholder="Selecciona el sexo"
        error={errors.sex?.message}
        value={selectedSex || ''}
        onChange={(e) => setValue('sex', e.target.value as 'macho' | 'hembra')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Fecha de nacimiento"
          type="date"
          required
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <Input
          label="Peso (kg)"
          type="number"
          step="0.01"
          required
          min={0.1}
          max={4.5}
          error={errors.weight?.message}
          {...register('weight')}
        />
      </div>

      <Select
        label="Propósito"
        required
        options={purposeOptions}
        placeholder="Selecciona el propósito"
        error={errors.purpose?.message}
        value={selectedPurpose || ''}
        onChange={(e) => setValue('purpose', e.target.value as 'Reproducción' | 'Engorde')}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? 'Registrar Conejo' : 'Guardar Cambios'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
