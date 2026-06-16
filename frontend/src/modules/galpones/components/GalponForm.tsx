'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Input, Button, Alert } from '@/shared/ui';
import { galponService } from '../services/galpon.service';
import type { Galpon } from '../types/galpon.types';
import { X } from 'lucide-react';

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

export function GalponForm({ defaultValues, galponId, mode, onSuccess, onCancel }: GalponFormProps) {
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<string[]>(defaultValues?.foodTypes || []);
  const [selectedVaccines, setSelectedVaccines] = useState<{ name: string; period: number }[]>(defaultValues?.vaccines || []);
  const [foodSearch, setFoodSearch] = useState('');
  const [vaccineSearch, setVaccineSearch] = useState('');
  const [provincesearch, setProvinceSearch] = useState('');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [customFood, setCustomFood] = useState('');
  const [customVaccine, setCustomVaccine] = useState('');
  const [customVaccinePeriod, setCustomVaccinePeriod] = useState('');
  const [showCustomFoodInput, setShowCustomFoodInput] = useState(false);
  const [showCustomVaccineInput, setShowCustomVaccineInput] = useState(false);

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
      setShowCustomFoodInput(true);
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
    if (customFood.trim() && !selectedFoods.includes(customFood.trim())) {
      const newFoods = [...selectedFoods, customFood.trim()];
      setSelectedFoods(newFoods);
      setValue('foodTypes', newFoods);
      setCustomFood('');
      setShowCustomFoodInput(false);
    }
  };

  const removeFood = (food: string) => {
    const newFoods = selectedFoods.filter(f => f !== food);
    setSelectedFoods(newFoods);
    setValue('foodTypes', newFoods);
  };

  const handleVaccineSelect = (vaccine: { name: string; period: number }) => {
    if (vaccine.name === 'Otra') {
      setShowCustomVaccineInput(true);
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
    if (customVaccine.trim() && customVaccinePeriod && !selectedVaccines.some(v => v.name === customVaccine.trim())) {
      const newVaccines = [...selectedVaccines, { name: customVaccine.trim(), period: parseInt(customVaccinePeriod) }];
      setSelectedVaccines(newVaccines);
      setValue('vaccines', newVaccines);
      setCustomVaccine('');
      setCustomVaccinePeriod('');
      setShowCustomVaccineInput(false);
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
    p.toLowerCase().includes(provincesearch.toLowerCase())
  );

  const selectedProvince = defaultValues?.province || '';

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    setSuccessMsg('');
    try {
      if (mode === 'create') {
        await galponService.create(values);
        setSuccessMsg('Galpón registrado exitosamente.');
      } else {
        await galponService.update(galponId!, values);
        setSuccessMsg('Galpón actualizado exitosamente.');
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

      <Input
        label="Nombre del Galpón"
        required
        placeholder="Ej: Galpón Principal"
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Provincia *</label>
        <div className="relative">
          <Input
            placeholder="Buscar provincia..."
            value={provincesearch}
            onChange={(e) => { setProvinceSearch(e.target.value); setShowProvinceDropdown(true); }}
            onFocus={() => setShowProvinceDropdown(true)}
          />
          {showProvinceDropdown && filteredProvinces.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
              {filteredProvinces.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProvinceSelect(p)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.province && <p className="text-sm text-red-600 mt-1">{errors.province.message}</p>}
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
        required
        placeholder="Ej: 100"
        error={errors.totalCapacity?.message}
        {...register('totalCapacity')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Tipos de Alimento *</label>
        <div className="relative mb-2">
          <Input
            placeholder="Buscar tipo de alimento..."
            value={foodSearch}
            onChange={(e) => { setFoodSearch(e.target.value); setShowFoodDropdown(true); }}
            onFocus={() => setShowFoodDropdown(true)}
          />
          {showFoodDropdown && filteredFoods.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
              {filteredFoods.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFoodSelect(f)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
        {showCustomFoodInput && (
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Especifica el tipo de alimento"
              value={customFood}
              onChange={(e) => setCustomFood(e.target.value)}
              autoFocus
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCustomFood}
            >
              Agregar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCustomFoodInput(false); setCustomFood(''); }}
            >
              Cancelar
            </Button>
          </div>
        )}
        {selectedFoods.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFoods.map(food => (
              <div key={food} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {food}
                <button
                  type="button"
                  onClick={() => removeFood(food)}
                  className="text-blue-600 hover:text-blue-900"
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
        <label className="block text-sm font-medium text-slate-600 mb-2">Vacunas *</label>
        <div className="relative mb-2">
          <Input
            placeholder="Buscar vacuna..."
            value={vaccineSearch}
            onChange={(e) => { setVaccineSearch(e.target.value); setShowVaccineDropdown(true); }}
            onFocus={() => setShowVaccineDropdown(true)}
          />
          {showVaccineDropdown && filteredVaccines.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
              {filteredVaccines.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => handleVaccineSelect(v)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                >
                  {v.name} - {v.period} días
                </button>
              ))}
            </div>
          )}
        </div>
        {showCustomVaccineInput && (
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Nombre de la vacuna"
              value={customVaccine}
              onChange={(e) => setCustomVaccine(e.target.value)}
              autoFocus
            />
            <Input
              type="number"
              placeholder="Período (días)"
              value={customVaccinePeriod}
              onChange={(e) => setCustomVaccinePeriod(e.target.value)}
              className="w-32"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCustomVaccine}
            >
              Agregar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCustomVaccineInput(false); setCustomVaccine(''); setCustomVaccinePeriod(''); }}
            >
              Cancelar
            </Button>
          </div>
        )}
        {selectedVaccines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedVaccines.map(vaccine => (
              <div key={vaccine.name} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {vaccine.name} ({vaccine.period})
                <button
                  type="button"
                  onClick={() => removeVaccine(vaccine.name)}
                  className="text-blue-600 hover:text-blue-900"
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
        label="Período de Desparasitación (días)"
        type="number"
        required
        placeholder="30"
        error={errors.dewormingPeriod?.message}
        {...register('dewormingPeriod')}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? 'Registrar Galpón' : 'Guardar Cambios'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
