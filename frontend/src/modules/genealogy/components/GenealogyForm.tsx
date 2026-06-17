'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button, Alert, Input, Dialog } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { genealogyService } from '../services/genealogy.service';
import { rabbitService } from '@/modules/rabbits/services/rabbit.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import type { Genealogy, UpdateGenealogyDto } from '../types/genealogy.types';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const schema = z.object({
  rabbitId: z.number().min(1, 'El conejo es obligatorio'),
  fatherId: z.number().optional().nullable(),
  motherId: z.number().optional().nullable(),
}).refine(
  (data) => data.fatherId !== null || data.motherId !== null,
  { message: 'Debes proporcionar al menos un padre o una madre', path: ['fatherId'] }
);

type FormValues = z.infer<typeof schema>;

interface GenealogyFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editData?: Genealogy;
}

export function GenealogyForm({ onSuccess, onCancel, editData }: GenealogyFormProps) {

  const { showToast } = useToast();
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [potentialFathers, setPotentialFathers] = useState<Rabbit[]>([]);
  const [potentialMothers, setPotentialMothers] = useState<Rabbit[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

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

  // Warning modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningDetails, setWarningDetails] = useState<string[]>([]);
  const [consequenceExplanation, setConsequenceExplanation] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState<FormValues | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editData) {
      const rabbit = rabbits.find(r => r.id === editData.rabbitId);
      const father = potentialFathers.find(r => r.id === editData.fatherId);
      const mother = potentialMothers.find(r => r.id === editData.motherId);
      
      if (rabbit) {
        setSelectedRabbit(rabbit);
        setRabbitSearch(`${rabbit.code} - ${rabbit.name}`);
        setValue('rabbitId', rabbit.id);
      }
      if (father) {
        setSelectedFather(father);
        setFatherSearch(`${father.code} - ${father.name}`);
        setValue('fatherId', father.id);
      }
      if (mother) {
        setSelectedMother(mother);
        setMotherSearch(`${mother.code} - ${mother.name}`);
        setValue('motherId', mother.id);
      }
    }
  }, [editData, rabbits, potentialFathers, potentialMothers, setValue]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allRabbits, fathers, mothers] = await Promise.all([
        rabbitService.getAll(),
        rabbitService.getPotentialFathers(),
        rabbitService.getPotentialMothers(),
      ]);
      setRabbits(allRabbits);
      setPotentialFathers(fathers);
      setPotentialMothers(mothers);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar conejos', 'error');
    } finally {
      setLoading(false);
    }
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
          const details: string[] = [];
          let explanation = '';
          
          if (result.consanguinityWarning.includes('madre ya tiene hijos con otros padres')) {
            details.push(' La madre seleccionada ya tiene hijos con otros padres.');
            explanation = 'Consecuencias: Los hijos de una misma madre con diferentes padres pueden tener menor variabilidad genética, lo que aumenta el riesgo de enfermedades hereditarias, reducción de la fertilidad, menor crecimiento y mayor susceptibilidad a infecciones en las camadas futuras.';
          }
          if (result.consanguinityWarning.includes('padre ya tiene hijos con otras madres')) {
            details.push(' El padre seleccionado ya tiene hijos con otras madres.');
            explanation = 'Consecuencias: Los hijos de un mismo padre con diferentes madres pueden acumular genes recesivos dañinos, lo que aumenta el riesgo de malformaciones congénitas, problemas de desarrollo, menor supervivencia y debilidad del sistema inmunológico en las generaciones siguientes.';
          }
          if (result.consanguinityWarning.includes('emparentados')) {
            details.push(' Los conejos seleccionados son emparentados (incesto directo o ancestros comunes).');
            explanation = 'Consecuencias: El cruce de conejos emparentados aumenta significativamente la expresión de genes recesivos dañinos, causando mutaciones genéticas, malformaciones físicas, esterilidad, baja tasa de supervivencia, problemas de crecimiento y enfermedades hereditarias severas en los descendientes.';
          }
          
          setWarningDetails(details);
          setConsequenceExplanation(explanation);
          setPendingSubmit(values);
          setShowWarningModal(true);
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
        const result = await genealogyService.register({
          rabbitId: values.rabbitId,
          fatherId: values.fatherId || undefined,
          motherId: values.motherId || undefined,
        });
        if (result.consanguinityWarning) {
          const details: string[] = [];
          let explanation = '';
          
          if (result.consanguinityWarning.includes('madre ya tiene hijos con otros padres')) {
            details.push('⚠️ La madre seleccionada ya tiene hijos con otros padres.');
            explanation = 'Consecuencias: Los hijos de una misma madre con diferentes padres pueden tener menor variabilidad genética, lo que aumenta el riesgo de enfermedades hereditarias, reducción de la fertilidad, menor crecimiento y mayor susceptibilidad a infecciones en las camadas futuras.';
          }
          if (result.consanguinityWarning.includes('padre ya tiene hijos con otras madres')) {
            details.push('⚠️ El padre seleccionado ya tiene hijos con otras madres.');
            explanation = 'Consecuencias: Los hijos de un mismo padre con diferentes madres pueden acumular genes recesivos dañinos, lo que aumenta el riesgo de malformaciones congénitas, problemas de desarrollo, menor supervivencia y debilidad del sistema inmunológico en las generaciones siguientes.';
          }
          if (result.consanguinityWarning.includes('emparentados')) {
            details.push('⚠️ Los conejos seleccionados son emparentados (incesto directo o ancestros comunes).');
            explanation = 'Consecuencias: El cruce de conejos emparentados aumenta significativamente la expresión de genes recesivos dañinos, causando mutaciones genéticas, malformaciones físicas, esterilidad, baja tasa de supervivencia, problemas de crecimiento y enfermedades hereditarias severas en los descendientes.';
          }
          
          setWarningDetails(details);
          setConsequenceExplanation(explanation);
          setPendingSubmit(values);
          setShowWarningModal(true);
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
    setWarningMessage('');
    setWarningDetails([]);
    setConsequenceExplanation('');
    setPendingSubmit(null);
  };

  const handleCancelWarning = () => {
    setShowWarningModal(false);
    setWarningMessage('');
    setWarningDetails([]);
    setConsequenceExplanation('');
    setPendingSubmit(null);
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

  if (loading) return <div className="text-center py-8">Cargando conejos...</div>;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <strong>Nota:</strong> No es necesario agregar ambos progenitores. Puedes registrar solo el padre, solo la madre, o ambos.
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Conejo *</label>
          <div className="relative">
            <Input
              placeholder="Buscar por código o nombre..."
              value={rabbitSearch}
              onChange={(e) => { setRabbitSearch(e.target.value); setShowRabbitDropdown(true); }}
              onFocus={() => setShowRabbitDropdown(true)}
              disabled={!!editData}
            />
            {showRabbitDropdown && filteredRabbits.length > 0 && !editData && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
                {filteredRabbits.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRabbitSelect(r)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                  >
                    {r.code} - {r.name} ({r.age} meses, {r.race})
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.rabbitId && <p className="text-sm text-red-600 mt-1">{errors.rabbitId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Padre</label>
          <div className="relative">
            <Input
              placeholder="Buscar por código o nombre..."
              value={fatherSearch}
              onChange={(e) => { setFatherSearch(e.target.value); setShowFatherDropdown(true); }}
              onFocus={() => setShowFatherDropdown(true)}
            />
            {editData && selectedFather && (
              <button
                type="button"
                onClick={handleClearFather}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
            {showFatherDropdown && filteredFathers.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
                {filteredFathers.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleFatherSelect(r)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                  >
                    {r.code} - {r.name} ({r.age} meses, {r.race})
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.fatherId && <p className="text-sm text-red-600 mt-1">{errors.fatherId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Madre</label>
          <div className="relative">
            <Input
              placeholder="Buscar por código o nombre..."
              value={motherSearch}
              onChange={(e) => { setMotherSearch(e.target.value); setShowMotherDropdown(true); }}
              onFocus={() => setShowMotherDropdown(true)}
            />
            {editData && selectedMother && (
              <button
                type="button"
                onClick={handleClearMother}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
            {showMotherDropdown && filteredMothers.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
                {filteredMothers.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleMotherSelect(r)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                  >
                    {r.code} - {r.name} ({r.age} meses, {r.race})
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.motherId && <p className="text-sm text-red-600 mt-1">{errors.motherId.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={isSubmitting}>
            {editData ? 'Actualizar Relación' : 'Registrar Relación'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
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
                {warningDetails.map((detail, index) => (
                  <li key={index}>{detail}</li>
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
