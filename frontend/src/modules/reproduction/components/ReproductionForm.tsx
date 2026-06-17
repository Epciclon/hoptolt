'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, useEffect } from 'react';
import { Input, Button, Alert } from '@/shared/ui';
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

export function ReproductionForm({ onSuccess, onCancel, editingReproduction }: ReproductionFormProps) {

  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFemale, setSelectedFemale] = useState<{ id: number; label: string } | null>(null);
  const [maleSearchTerm, setMaleSearchTerm] = useState('');
  const [showMaleDropdown, setShowMaleDropdown] = useState(false);
  const [selectedMale, setSelectedMale] = useState<{ id: number; label: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const maleDropdownRef = useRef<HTMLDivElement>(null);
  const { reproductionFemales, reproductionMales, reproductions, createReproduction, updateReproduction } = useReproduction();
  const isEditing = !!editingReproduction;

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editingReproduction ? {
      femaleId: editingReproduction.femaleId,
      maleId: editingReproduction.maleId,
      mountDate: editingReproduction.mountDate.split('T')[0],
    } : undefined,
  });

  useEffect(() => {
    if (editingReproduction) {
      setSelectedFemale({
        id: editingReproduction.femaleId,
        label: `${editingReproduction.femaleCode}${editingReproduction.femaleName ? ` — ${editingReproduction.femaleName}` : ''}`
      });
      setSearchTerm(`${editingReproduction.femaleCode}${editingReproduction.femaleName ? ` — ${editingReproduction.femaleName}` : ''}`);

      if (editingReproduction.maleId && editingReproduction.maleCode) {
        setSelectedMale({
          id: editingReproduction.maleId,
          label: `${editingReproduction.maleCode}${editingReproduction.maleName ? ` — ${editingReproduction.maleName}` : ''}`
        });
        setMaleSearchTerm(`${editingReproduction.maleCode}${editingReproduction.maleName ? ` — ${editingReproduction.maleName}` : ''}`);
      }
    }
  }, [editingReproduction]);

  const filteredFemales = reproductionFemales
    .filter(f => f.age >= 4)
    .filter(f => {
      // Filtrar conejas con monta activa (fecha estimada de parto futura)
      const currentDate = new Date();
      const activeMount = reproductions.find(r => r.femaleId === f.id && new Date(r.estimatedBirthDate) > currentDate);
      // En modo edición, permitir la coneja que se está editando
      if (isEditing && editingReproduction && editingReproduction.femaleId === f.id) {
        return true;
      }
      return !activeMount;
    })
    .filter(f =>
      f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(f.cageNumber).includes(searchTerm)
    );

  const filteredMales = reproductionMales
    .filter(m => m.age >= 4)
    .filter(m => !selectedMale || m.id !== selectedMale.id)
    .filter(m =>
      m.code.toLowerCase().includes(maleSearchTerm.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(maleSearchTerm.toLowerCase())) ||
      String(m.cageNumber).includes(maleSearchTerm)
    );

  const handleSelect = (female: typeof reproductionFemales[0]) => {
    setSelectedFemale({ id: female.id, label: `${female.code}${female.name ? ` — ${female.name}` : ''}` });
    setSearchTerm(`${female.code}${female.name ? ` — ${female.name}` : ''}`);
    setValue('femaleId', female.id);
    setShowDropdown(false);
  };

  const handleMaleSelect = (male: typeof reproductionMales[0]) => {
    setSelectedMale({ id: male.id, label: `${male.code}${male.name ? ` — ${male.name}` : ''}` });
    setMaleSearchTerm(`${male.code}${male.name ? ` — ${male.name}` : ''}`);
    setValue('maleId', male.id);
    setShowMaleDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (selectedFemale) {
      setSelectedFemale(null);
      setValue('femaleId', 0);
    }
  };

  const handleMaleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaleSearchTerm(e.target.value);
    setShowMaleDropdown(true);
    if (selectedMale) {
      setSelectedMale(null);
      setValue('maleId', 0);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowDropdown(false);
    }
    if (maleDropdownRef.current && !maleDropdownRef.current.contains(event.target as Node)) {
      setShowMaleDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSubmit = async (values: FormValues) => {

    try {
      if (isEditing && editingReproduction) {
        await updateReproduction(editingReproduction.id, values);
        showToast('Monta actualizada exitosamente.', 'success');
      } else {
        await createReproduction(values);
        showToast('Monta registrada exitosamente.', 'success');
      }
      setSearchTerm('');
      setSelectedFemale(null);
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

      <div className="flex flex-col gap-1.5" ref={dropdownRef}>
        <label className="text-sm font-medium text-slate-700">
          Coneja <span className="text-red-500 ml-0.5">*</span>
        </label>
        {isEditing ? (
          <Input
            placeholder="Coneja"
            value={searchTerm}
            disabled
            className="bg-slate-100 cursor-not-allowed"
          />
        ) : (
          <div className="relative">
            <Input
              placeholder="Escribe código, nombre o número de jaula..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              error={!selectedFemale && errors.femaleId?.message ? errors.femaleId.message : undefined}
            />
            {showDropdown && filteredFemales.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredFemales.map((female) => (
                  <div
                    key={female.id}
                    className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-sm"
                    onClick={() => handleSelect(female)}
                  >
                    {female.code}{female.name ? ` — ${female.name}` : ''}
                  </div>
                ))}
              </div>
            )}
            {showDropdown && filteredFemales.length === 0 && searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
                No se encontraron conejas
              </div>
            )}
          </div>
        )}
        {!selectedFemale && errors.femaleId?.message && (
          <p className="text-xs text-red-500">{errors.femaleId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5" ref={maleDropdownRef}>
        <label className="text-sm font-medium text-slate-700">
          Conejo <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <Input
            placeholder="Escribe código, nombre o número de jaula..."
            value={maleSearchTerm}
            onChange={handleMaleSearchChange}
            onFocus={() => setShowMaleDropdown(true)}
          />
          {showMaleDropdown && filteredMales.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredMales.map((male) => (
                <div
                  key={male.id}
                  className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-sm"
                  onClick={() => handleMaleSelect(male)}
                >
                  {male.code}{male.name ? ` — ${male.name}` : ''}
                </div>
              ))}
            </div>
          )}
          {showMaleDropdown && filteredMales.length === 0 && maleSearchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
              No se encontraron machos
            </div>
          )}
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
        <Button type="submit" loading={isSubmitting}>
          {isEditing ? 'Actualizar Monta' : 'Registrar Monta'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
