'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, useEffect } from 'react';
import { Input, Button, Dialog } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { galponService } from '../services/galpon.service';
import type { Galpon } from '../types/galpon.types';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const PROVINCES = [
  'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro',
  'Esmeraldas', 'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos',
  'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza', 'Pichincha',
  'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua',
  'Zamora Chinchipe', 'Otros'
];

const FOOD_TYPES = ['Hierba', 'Balanceado', 'Heno', 'Afrecho', 'Otro'];
const VACCINES_PREDEFINED = [
  { name: 'Mixomatosis', period: 365 },
  { name: 'VHD', period: 365 },
  { name: 'Pasteurelosis', period: 180 },
  { name: 'Estafilococosis', period: 180 },
  { name: 'Otra', period: 0 },
];

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50),
  province: z.string().min(1, 'La provincia es obligatoria'),
  location: z.string().min(1, 'La ubicación es obligatoria').max(100),
  totalCapacity: z.coerce.number().int().positive('Debe ser un número positivo'),
  foodTypes: z.array(z.string()).min(1, 'Selecciona al menos un tipo de alimento'),
  vaccines: z.array(z.object({
    name: z.string().min(1, 'El nombre de la vacuna es obligatorio'),
    period: z.coerce.number().int().positive('El período debe ser positivo'),
  })).min(1, 'Selecciona al menos una vacuna'),
  dewormingPeriod: z.coerce.number().int().positive('El período debe ser positivo'),
});

type FormValues = z.infer<typeof schema>;

interface GalponFormProps {
  defaultValues?: Partial<Galpon>;
  galponId?: number;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GalponForm({ defaultValues, galponId, mode, onSuccess, onCancel }: Readonly<GalponFormProps>) {

  const { showToast } = useToast();
  const [selectedFoods, setSelectedFoods] = useState<string[]>(defaultValues?.foodTypes || []);
  const [selectedVaccines, setSelectedVaccines] = useState<{ name: string; period: number }[]>(defaultValues?.vaccines || []);
  const [foodSearch, setFoodSearch] = useState('');
  const [vaccineSearch, setVaccineSearch] = useState('');
  const queryClient = useQueryClient();
  const [provinceSearch, setProvinceSearch] = useState(defaultValues?.province || '');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  
  const [customFood, setCustomFood] = useState('');
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  
  const [customVaccine, setCustomVaccine] = useState('');
  const [customVaccinePeriod, setCustomVaccinePeriod] = useState('');
  const [showCustomVaccineModal, setShowCustomVaccineModal] = useState(false);

  const provinceDropdownRef = useRef<HTMLDivElement>(null);
  const foodDropdownRef = useRef<HTMLDivElement>(null);
  const vaccineDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (provinceDropdownRef.current && !provinceDropdownRef.current.contains(target)) {
        setShowProvinceDropdown(false);
      }
      if (foodDropdownRef.current && !foodDropdownRef.current.contains(target)) {
        setShowFoodDropdown(false);
      }
      if (vaccineDropdownRef.current && !vaccineDropdownRef.current.contains(target)) {
        setShowVaccineDropdown(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside as EventListener);
    return () => document.removeEventListener('pointerdown', handleClickOutside as EventListener);
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name,
      province: defaultValues?.province,
      location: defaultValues?.location,
      totalCapacity: defaultValues?.totalCapacity,
      foodTypes: defaultValues?.foodTypes || [],
      vaccines: defaultValues?.vaccines || [],
      dewormingPeriod: defaultValues?.dewormingPeriod || 90,
    },
  });

  const handleFoodSelect = (food: string) => {
    if (food === 'Otro') {
      setShowCustomFoodModal(true);
      setFoodSearch('');
      setShowFoodDropdown(false);
      return;
    }
    if (!selectedFoods.includes(food)) {
      const newFoods = [...selectedFoods, food];
      setSelectedFoods(newFoods);
      setValue('foodTypes', newFoods);
    }
    setFoodSearch('');
    setShowFoodDropdown(false);
  };

  const addCustomFood = () => {
    const trimmed = customFood.trim();
    if (trimmed && !selectedFoods.includes(trimmed)) {
      const newFoods = [...selectedFoods, trimmed];
      setSelectedFoods(newFoods);
      setValue('foodTypes', newFoods);
      setCustomFood('');
      setShowCustomFoodModal(false);
    }
  };

  const removeFood = (food: string) => {
    const newFoods = selectedFoods.filter(f => f !== food);
    setSelectedFoods(newFoods);
    setValue('foodTypes', newFoods);
  };

  const handleVaccineSelect = (vaccine: { name: string; period: number }) => {
    if (vaccine.name === 'Otra') {
      setShowCustomVaccineModal(true);
      setVaccineSearch('');
      setShowVaccineDropdown(false);
      return;
    }
    if (!selectedVaccines.some(v => v.name === vaccine.name)) {
      const newVaccines = [...selectedVaccines, vaccine];
      setSelectedVaccines(newVaccines);
      setValue('vaccines', newVaccines);
    }
    setVaccineSearch('');
    setShowVaccineDropdown(false);
  };

  const addCustomVaccine = () => {
    const trimmed = customVaccine.trim();
    const periodNum = Number.parseInt(customVaccinePeriod, 10);
    if (trimmed && periodNum > 0 && !selectedVaccines.some(v => v.name === trimmed)) {
      const newVaccines = [...selectedVaccines, { name: trimmed, period: periodNum }];
      setSelectedVaccines(newVaccines);
      setValue('vaccines', newVaccines);
      setCustomVaccine('');
      setCustomVaccinePeriod('');
      setShowCustomVaccineModal(false);
    }
  };

  const removeVaccine = (name: string) => {
    const newVaccines = selectedVaccines.filter(v => v.name !== name);
    setSelectedVaccines(newVaccines);
    setValue('vaccines', newVaccines);
  };

  const handleProvinceSelect = (province: string) => {
    setValue('province', province);
    setProvinceSearch(province);
    setShowProvinceDropdown(false);
  };

  const filteredFoods = FOOD_TYPES.filter(f =>
    f.toLowerCase().includes(foodSearch.toLowerCase()) && !selectedFoods.includes(f)
  );

  const filteredVaccines = VACCINES_PREDEFINED.filter(v =>
    v.name.toLowerCase().includes(vaccineSearch.toLowerCase()) && !selectedVaccines.some(sv => sv.name === v.name)
  );

  const filteredProvinces = PROVINCES.filter(p =>
    p.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === 'create') {
        await galponService.create(values);
        showToast('Galpón registrado exitosamente.', 'success');
      } else {
        await galponService.update(galponId!, values);
        showToast('Galpón actualizado exitosamente.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['galpones'] });
      queryClient.invalidateQueries({ queryKey: ['activeGalpon'] });
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

      <Input
        label="Nombre del Galpón"
        required
        placeholder="Ej: Galpón Principal"
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <label className="block text-sm font-medium text-main mb-1.5">
          Provincia <span className="text-muted ml-0.5">*</span>
        </label>
        <div className="relative" ref={provinceDropdownRef}>
          <Input
            placeholder="Buscar provincia..."
            value={provinceSearch}
            onChange={(e) => { setProvinceSearch(e.target.value); setShowProvinceDropdown(true); }}
            onFocus={() => setShowProvinceDropdown(true)}
          />
          {showProvinceDropdown && filteredProvinces.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-card border border-strong rounded-md mt-1 max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto z-20 shadow-lg">
              {filteredProvinces.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProvinceSelect(p)}
                  className="w-full text-left px-3 py-2 hover:bg-theme-surface border-b border-default text-sm last:border-b-0 cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.province && <p className="text-sm text-red-600">{errors.province.message}</p>}
      </div>

      <Input
        label="Ubicación"
        required
        placeholder="Ej: Sector norte"
        error={errors.location?.message}
        {...register('location')}
      />

      <Input
        label="Capacidad Total"
        type="number"
        min={1}
        step={1}
        required
        placeholder="Ej: 100"
        error={errors.totalCapacity?.message}
        onKeyDown={(e) => {
          if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
            e.preventDefault();
          }
        }}
        {...register('totalCapacity')}
      />

      <div>
        <label className="block text-sm font-medium text-main mb-1.5">
          Tipos de Alimento <span className="text-muted ml-0.5">*</span>
        </label>
        <div className="relative mb-2" ref={foodDropdownRef}>
          <Input
            placeholder="Buscar tipo de alimento..."
            value={foodSearch}
            onChange={(e) => { setFoodSearch(e.target.value); setShowFoodDropdown(true); }}
            onFocus={() => setShowFoodDropdown(true)}
          />
          {showFoodDropdown && filteredFoods.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-card border border-strong rounded-md mt-1 max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto z-20 shadow-lg">
              {filteredFoods.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFoodSelect(f)}
                  className="w-full text-left px-3 py-2 hover:bg-theme-surface border-b border-default text-sm last:border-b-0 cursor-pointer"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedFoods.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFoods.map(food => (
              <div key={food} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-2">
                <span>{food}</span>
                <button
                  type="button"
                  onClick={() => removeFood(food)}
                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 cursor-pointer"
                  title={`Quitar ${food}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {errors.foodTypes && <p className="text-sm text-red-600">{errors.foodTypes.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-main mb-1.5">
          Vacunas <span className="text-muted ml-0.5">*</span>
        </label>
        <div className="relative mb-2" ref={vaccineDropdownRef}>
          <Input
            placeholder="Buscar vacuna..."
            value={vaccineSearch}
            onChange={(e) => { setVaccineSearch(e.target.value); setShowVaccineDropdown(true); }}
            onFocus={() => setShowVaccineDropdown(true)}
          />
          {showVaccineDropdown && filteredVaccines.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-card border border-strong rounded-md mt-1 max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto z-20 shadow-lg">
              {filteredVaccines.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => handleVaccineSelect(v)}
                  className="w-full text-left px-3 py-2 hover:bg-theme-surface border-b border-default text-sm last:border-b-0 cursor-pointer"
                >
                  {v.name} - cada {v.period} días
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedVaccines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedVaccines.map(vaccine => (
              <div key={vaccine.name} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-2">
                <span>{vaccine.name} - cada {vaccine.period} días</span>
                <button
                  type="button"
                  onClick={() => removeVaccine(vaccine.name)}
                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 cursor-pointer"
                  title={`Quitar ${vaccine.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {errors.vaccines && <p className="text-sm text-red-600">{errors.vaccines.message}</p>}
      </div>

      <Input
        label="Período de Desparasitación en días"
        type="number"
        min={1}
        step={1}
        required
        placeholder="30"
        error={errors.dewormingPeriod?.message}
        onKeyDown={(e) => {
          if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
            e.preventDefault();
          }
        }}
        {...register('dewormingPeriod')}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? 'Registrar Galpón' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Modal para Agregar Tipo de Alimento Personalizado */}
      <Dialog
        open={showCustomFoodModal}
        onClose={() => { setShowCustomFoodModal(false); setCustomFood(''); }}
        title="Agregar tipo de alimento"
        description="Ingresa un nuevo alimento para tus conejos"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Nombre del alimento"
            placeholder="Ej: Alfalfa fresca, Zanahoria"
            value={customFood}
            onChange={(e) => setCustomFood(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCustomFoodModal(false); setCustomFood(''); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={addCustomFood}
              disabled={!customFood.trim()}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal para Agregar Vacuna Personalizada */}
      <Dialog
        open={showCustomVaccineModal}
        onClose={() => { setShowCustomVaccineModal(false); setCustomVaccine(''); setCustomVaccinePeriod(''); }}
        title="Agregar vacuna"
        description="Ingresa el nombre y período de aplicación"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Nombre de la vacuna"
            placeholder="Ej: Rabia"
            value={customVaccine}
            onChange={(e) => setCustomVaccine(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Período de aplicación en días"
            type="number"
            min={1}
            step={1}
            placeholder="Ej: 180"
            value={customVaccinePeriod}
            onChange={(e) => setCustomVaccinePeriod(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
                e.preventDefault();
              }
            }}
            required
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCustomVaccineModal(false); setCustomVaccine(''); setCustomVaccinePeriod(''); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={addCustomVaccine}
              disabled={!customVaccine.trim() || !customVaccinePeriod || Number(customVaccinePeriod) <= 0}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Dialog>

    </form>
  );
}
