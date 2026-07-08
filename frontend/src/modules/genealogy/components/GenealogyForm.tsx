'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, Dialog, LoadingMessage, RabbitSelectableCard } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { genealogyService } from '../services/genealogy.service';
import { rabbitService } from '@/modules/rabbits/services/rabbit.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import type { UpdateGenealogyDto } from '../types/genealogy.types';
import { X } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

const schema = z.object({
  rabbitId: z.number().min(1, 'El conejo es obligatorio'),
  fatherId: z.number().optional().nullable(),
  motherId: z.number().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface GenealogyFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  rabbitId?: number;
}

export function GenealogyForm({ onSuccess, onCancel, rabbitId }: Readonly<GenealogyFormProps>) {

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: allRabbitsData, isLoading: loadingRabbits } = useQuery({
    queryKey: ['rabbits', 'all'],
    queryFn: () => rabbitService.getAll({ limit: 1000 }).then(res => res.rabbits),
    staleTime: 5 * 60 * 1000,
  });
  
  const { data: fathersData, isLoading: loadingFathers } = useQuery({
    queryKey: ['rabbits', 'potentialFathers'],
    queryFn: () => rabbitService.getPotentialFathers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mothersData, isLoading: loadingMothers } = useQuery({
    queryKey: ['rabbits', 'potentialMothers'],
    queryFn: () => rabbitService.getPotentialMothers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingGenealogy, isLoading: loadingGenealogy } = useQuery({
    queryKey: ['genealogy', rabbitId],
    queryFn: () => rabbitId ? genealogyService.getByRabbitId(rabbitId).catch(() => null) : null,
    enabled: !!rabbitId,
  });

  const rabbits = allRabbitsData || [];
  const potentialFathers = fathersData || [];
  const potentialMothers = mothersData || [];
  const loading = loadingRabbits || loadingFathers || loadingMothers || loadingGenealogy;
  const editData = existingGenealogy;

  // Search states
  const [rabbitSearch, setRabbitSearch] = useState('');
  const [fatherSearch, setFatherSearch] = useState('');
  const [motherSearch, setMotherSearch] = useState('');
  const [showRabbitDropdown, setShowRabbitDropdown] = useState(false);
  const [showFatherDropdown, setShowFatherDropdown] = useState(false);
  const [showMotherDropdown, setShowMotherDropdown] = useState(false);

  // Selected rabbits
  const [selectedRabbit, setSelectedRabbit] = useState<Rabbit | null>(null);
  const [selectedFather, setSelectedFather] = useState<Rabbit | null>(null);
  const [selectedMother, setSelectedMother] = useState<Rabbit | null>(null);

  const rabbitDropdownRef = useRef<HTMLDivElement>(null);
  const fatherDropdownRef = useRef<HTMLDivElement>(null);
  const motherDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rabbitDropdownRef.current && !rabbitDropdownRef.current.contains(event.target as Node)) {
        setShowRabbitDropdown(false);
      }
      if (fatherDropdownRef.current && !fatherDropdownRef.current.contains(event.target as Node)) {
        setShowFatherDropdown(false);
      }
      if (motherDropdownRef.current && !motherDropdownRef.current.contains(event.target as Node)) {
        setShowMotherDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Warning modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningDetails, setWarningDetails] = useState<string[]>([]);
  const [consequenceExplanation, setConsequenceExplanation] = useState('');

  const { handleSubmit, formState: { errors, isSubmitting }, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (loading || !rabbitId) return;

    const rabbit = rabbits.find((r: Rabbit) => r.id === rabbitId);
    if (rabbit) {
      setSelectedRabbit(rabbit);
      setValue('rabbitId', rabbit.id);
    }
    
    if (!existingGenealogy) return;

    if (existingGenealogy.fatherId) {
      const father = potentialFathers.find((r: Rabbit) => r.id === existingGenealogy.fatherId);
      if (father) {
        setSelectedFather(father);
        setValue('fatherId', father.id);
      }
    }
    if (existingGenealogy.motherId) {
      const mother = potentialMothers.find((r: Rabbit) => r.id === existingGenealogy.motherId);
      if (mother) {
        setSelectedMother(mother);
        setValue('motherId', mother.id);
      }
    }
  }, [loading, rabbitId, rabbits, potentialFathers, potentialMothers, existingGenealogy, setValue]);

  const handleConsanguinityWarning = (warningStr: string) => {
    const details: string[] = [];
    let explanation = '';
    
    if (warningStr.includes('madre ya tiene hijos con otros padres')) {
      details.push('⚠️ La madre seleccionada ya tiene hijos con otros padres.');
      explanation = 'Consecuencias: Los hijos de una misma madre con diferentes padres pueden tener menor variabilidad genética, lo que aumenta el riesgo de enfermedades hereditarias, reducción de la fertilidad, menor crecimiento y mayor susceptibilidad a infecciones en las camadas futuras.';
    }
    if (warningStr.includes('padre ya tiene hijos con otras madres')) {
      details.push('⚠️ El padre seleccionado ya tiene hijos con otras madres.');
      explanation = 'Consecuencias: Los hijos de un mismo padre con diferentes madres pueden acumular genes recesivos dañinos, lo que aumenta el riesgo de malformaciones congénitas, problemas de desarrollo, menor supervivencia y debilidad del sistema inmunológico en las generaciones siguientes.';
    }
    if (warningStr.includes('emparentados')) {
      details.push('⚠️ Los conejos seleccionados son emparentados (incesto directo o ancestros comunes).');
      explanation = 'Consecuencias: El cruce de conejos emparentados aumenta significativamente la expresión de genes recesivos dañinos, causando mutaciones genéticas, malformaciones físicas, esterilidad, baja tasa de supervivencia, problemas de crecimiento y enfermedades hereditarias severas en los descendientes.';
    }
    
    setWarningDetails(details);
    setConsequenceExplanation(explanation);
    setShowWarningModal(true);
  };

  const onSubmit = async (values: FormValues) => {

    try {
      if (editData) {
        const payload: UpdateGenealogyDto = {
          fatherId: values.fatherId ?? null,
          motherId: values.motherId ?? null,
        };
        const result = await genealogyService.edit(editData.rabbitId, payload);
        if (result.consanguinityWarning) {
          handleConsanguinityWarning(result.consanguinityWarning);
          return;
        }
        showToast('Relación genealógica actualizada exitosamente.', 'success');
        queryClient.invalidateQueries({ queryKey: ['genealogies'] });
        onSuccess?.();
        reset();
        setSelectedRabbit(null);
        setSelectedFather(null);
        setSelectedMother(null);
        setRabbitSearch('');
        setFatherSearch('');
        setMotherSearch('');
      } else {
        const payload = {
          rabbitId: values.rabbitId,
          fatherId: values.fatherId ?? undefined,
          motherId: values.motherId ?? undefined,
        };
        const result = await genealogyService.register(payload);
        if (result.consanguinityWarning) {
          handleConsanguinityWarning(result.consanguinityWarning);
          return;
        }
        showToast('Relación genealógica registrada exitosamente.', 'success');
        queryClient.invalidateQueries({ queryKey: ['genealogies'] });
        onSuccess?.();
        reset();
        setSelectedRabbit(null);
        setSelectedFather(null);
        setSelectedMother(null);
        setRabbitSearch('');
        setFatherSearch('');
        setMotherSearch('');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    }
  };

  const handleConfirmWarning = () => {
    setShowWarningModal(false);
    showToast(editData ? 'Relación genealógica actualizada exitosamente.' : 'Relación genealógica registrada exitosamente.', 'success');
    queryClient.invalidateQueries({ queryKey: ['genealogies'] });
    onSuccess?.();
    reset();
    setSelectedRabbit(null);
    setSelectedFather(null);
    setSelectedMother(null);
    setRabbitSearch('');
    setFatherSearch('');
    setMotherSearch('');
    setWarningDetails([]);
    setConsequenceExplanation('');
  };

  const handleCancelWarning = () => {
    setShowWarningModal(false);
    setWarningDetails([]);
    setConsequenceExplanation('');
  };

  const handleRabbitSelect = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setRabbitSearch(`${rabbit.code} - ${rabbit.name}`);
    setValue('rabbitId', rabbit.id);
    setShowRabbitDropdown(false);
  };

  const handleFatherSelect = (rabbit: Rabbit) => {
    setSelectedFather(rabbit);
    setFatherSearch(`${rabbit.code} - ${rabbit.name}`);
    setValue('fatherId', rabbit.id);
    setShowFatherDropdown(false);
  };

  const handleMotherSelect = (rabbit: Rabbit) => {
    setSelectedMother(rabbit);
    setMotherSearch(`${rabbit.code} - ${rabbit.name}`);
    setValue('motherId', rabbit.id);
    setShowMotherDropdown(false);
  };

  const handleClearFather = () => {
    setSelectedFather(null);
    setFatherSearch('');
    setValue('fatherId', null);
  };

  const handleClearMother = () => {
    setSelectedMother(null);
    setMotherSearch('');
    setValue('motherId', null);
  };

  const filteredRabbits = rabbits.filter(r =>
    r.code.toLowerCase().includes(rabbitSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(rabbitSearch.toLowerCase())
  );

  const filteredFathers = potentialFathers.filter(r =>
    (r.code.toLowerCase().includes(fatherSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(fatherSearch.toLowerCase())) &&
    r.id !== selectedRabbit?.id
  );

  const filteredMothers = potentialMothers.filter(r =>
    (r.code.toLowerCase().includes(motherSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(motherSearch.toLowerCase())) &&
    r.id !== selectedRabbit?.id
  );

  if (loading) return <LoadingMessage message="Cargando conejos..." />;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        <p className="text-sm font-medium text-slate-700">
          No es necesario agregar ambos progenitores. Puedes registrar solo el padre, solo la madre, o ambos.
        </p>

        <div>
          <span className="block text-sm font-medium text-slate-600 mb-2">Conejo *</span>
          {selectedRabbit ? (
            <RabbitSelectableCard 
              rabbit={selectedRabbit} 
              onRemove={!rabbitId && !editData ? () => { setSelectedRabbit(null); setValue('rabbitId', 0 as any); setRabbitSearch(''); } : undefined} 
            />
          ) : (
            <div className="relative" ref={rabbitDropdownRef}>
              <Input
                placeholder="Buscar por código o nombre..."
                value={rabbitSearch}
                onChange={(e) => { setRabbitSearch(e.target.value); setShowRabbitDropdown(true); }}
                onFocus={() => setShowRabbitDropdown(true)}
                disabled={!!rabbitId || !!editData}
              />
              {showRabbitDropdown && filteredRabbits.length > 0 && !rabbitId && !editData && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-64 overflow-y-auto z-50 shadow-lg p-2 flex flex-col gap-2">
                  {filteredRabbits.map(r => (
                    <RabbitSelectableCard
                      key={r.id}
                      rabbit={r}
                      onClick={() => handleRabbitSelect(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.rabbitId && <p className="text-sm text-red-600 mt-1">{errors.rabbitId.message}</p>}
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-600 mb-2">Padre</span>
          {selectedFather ? (
            <RabbitSelectableCard 
              rabbit={selectedFather} 
              onRemove={handleClearFather} 
            />
          ) : (
            <div className="relative" ref={fatherDropdownRef}>
              <Input
                placeholder="Buscar por código o nombre..."
                value={fatherSearch}
                onChange={(e) => { setFatherSearch(e.target.value); setShowFatherDropdown(true); }}
                onFocus={() => setShowFatherDropdown(true)}
              />
              {showFatherDropdown && filteredFathers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-64 overflow-y-auto z-50 shadow-lg p-2 flex flex-col gap-2">
                  {filteredFathers.map(r => (
                    <RabbitSelectableCard
                      key={r.id}
                      rabbit={r}
                      onClick={() => handleFatherSelect(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.fatherId && <p className="text-sm text-red-600 mt-1">{errors.fatherId.message}</p>}
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-600 mb-2">Madre</span>
          {selectedMother ? (
            <RabbitSelectableCard 
              rabbit={selectedMother} 
              onRemove={handleClearMother} 
            />
          ) : (
            <div className="relative" ref={motherDropdownRef}>
              <Input
                placeholder="Buscar por código o nombre..."
                value={motherSearch}
                onChange={(e) => { setMotherSearch(e.target.value); setShowMotherDropdown(true); }}
                onFocus={() => setShowMotherDropdown(true)}
              />
              {showMotherDropdown && filteredMothers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-64 overflow-y-auto z-50 shadow-lg p-2 flex flex-col gap-2">
                  {filteredMothers.map(r => (
                    <RabbitSelectableCard
                      key={r.id}
                      rabbit={r}
                      onClick={() => handleMotherSelect(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.motherId && <p className="text-sm text-red-600 mt-1">{errors.motherId.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Guardar Cambios
        </Button>
      </div>
      </form>

      <Dialog
        open={showWarningModal}
        onClose={handleCancelWarning}
        title="Advertencia de Consanguinidad"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Advertencia de Consanguinidad</p>
            {warningDetails.length > 0 && (
              <ul className="text-sm text-red-700 space-y-1">
                {warningDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
          {consequenceExplanation && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm text-amber-800">{consequenceExplanation}</p>
            </div>
          )}
          <p className="text-sm text-slate-600">
            El registro se completará exitosamente, pero debe ser consciente de las consecuencias genéticas que esto puede tener en los descendientes.
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleConfirmWarning}>
              Entendido, Continuar
            </Button>
            <Button variant="secondary" onClick={handleCancelWarning}>
              Cancelar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
