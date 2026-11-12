'use client';

import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Dialog, LoadingMessage, RabbitSelectableCard, DropdownPortal } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { genealogyService } from '../services/genealogy.service';
import { rabbitService } from '@/modules/rabbits/services/rabbit.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
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

  const rabbits = useMemo(() => allRabbitsData || [], [allRabbitsData]);
  const potentialFathers = useMemo(() => fathersData || [], [fathersData]);
  const potentialMothers = useMemo(() => mothersData || [], [mothersData]);
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
  const rabbitMenuRef = useRef<HTMLDivElement>(null);
  const fatherDropdownRef = useRef<HTMLDivElement>(null);
  const fatherMenuRef = useRef<HTMLDivElement>(null);
  const motherDropdownRef = useRef<HTMLDivElement>(null);
  const motherMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rabbitDropdownRef.current?.contains(target) && !rabbitMenuRef.current?.contains(target)) {
        setShowRabbitDropdown(false);
      }
      if (!fatherDropdownRef.current?.contains(target) && !fatherMenuRef.current?.contains(target)) {
        setShowFatherDropdown(false);
      }
      if (!motherDropdownRef.current?.contains(target) && !motherMenuRef.current?.contains(target)) {
        setShowMotherDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

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

  const handleConsanguinityWarning = () => {
    setShowWarningModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editData) {
        const payload: any = {
          fatherId: values.fatherId ?? null,
          motherId: values.motherId ?? null,
        };
        const result = await genealogyService.edit(editData.rabbitId, payload);
        if (result?.requiresConfirmation || result?.consanguinityWarning) {
          setPendingValues(values);
          handleConsanguinityWarning();
          return;
        }
        showToast('Relación genealógica actualizada exitosamente.', 'success');
        queryClient.invalidateQueries({ queryKey: ['genealogies'] });
        queryClient.invalidateQueries({ queryKey: ['genealogy'] });
        queryClient.invalidateQueries({ queryKey: ['genealogyTree'] });
        onSuccess?.();
        reset();
        setSelectedRabbit(null);
        setSelectedFather(null);
        setSelectedMother(null);
        setRabbitSearch('');
        setFatherSearch('');
        setMotherSearch('');
      } else {
        const payload: any = {
          rabbitId: values.rabbitId,
          fatherId: values.fatherId ?? undefined,
          motherId: values.motherId ?? undefined,
        };
        const result = await genealogyService.register(payload);
        if (result?.requiresConfirmation || result?.consanguinityWarning) {
          setPendingValues(values);
          handleConsanguinityWarning();
          return;
        }
        showToast('Relación genealógica registrada exitosamente.', 'success');
        queryClient.invalidateQueries({ queryKey: ['genealogies'] });
        queryClient.invalidateQueries({ queryKey: ['genealogy'] });
        queryClient.invalidateQueries({ queryKey: ['genealogyTree'] });
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

  const handleConfirmWarning = async () => {
    if (!pendingValues || isConfirming) return;
    setIsConfirming(true);
    try {
      if (editData) {
        const payload: any = {
          fatherId: pendingValues.fatherId ?? null,
          motherId: pendingValues.motherId ?? null,
          confirmConsanguinity: true
        };
        await genealogyService.edit(editData.rabbitId, payload);
      } else {
        const payload: any = {
          rabbitId: pendingValues.rabbitId,
          fatherId: pendingValues.fatherId ?? undefined,
          motherId: pendingValues.motherId ?? undefined,
          confirmConsanguinity: true
        };
        await genealogyService.register(payload);
      }
      setShowWarningModal(false);
      setPendingValues(null);
      showToast(editData ? 'Relación genealógica actualizada exitosamente.' : 'Relación genealógica registrada exitosamente.', 'success');
      queryClient.invalidateQueries({ queryKey: ['genealogies'] });
      queryClient.invalidateQueries({ queryKey: ['genealogy'] });
      queryClient.invalidateQueries({ queryKey: ['genealogyTree'] });
      onSuccess?.();
      reset();
      setSelectedRabbit(null);
      setSelectedFather(null);
      setSelectedMother(null);
      setRabbitSearch('');
      setFatherSearch('');
      setMotherSearch('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado.', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelWarning = () => {
    if (isConfirming) return;
    setShowWarningModal(false);
    setPendingValues(null);
  };

  const handleRabbitSelect = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setRabbitSearch(rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code);
    setValue('rabbitId', rabbit.id);
    setShowRabbitDropdown(false);
  };

  const handleFatherSelect = (rabbit: Rabbit) => {
    setSelectedFather(rabbit);
    setFatherSearch(rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code);
    setValue('fatherId', rabbit.id);
    setShowFatherDropdown(false);
  };

  const handleMotherSelect = (rabbit: Rabbit) => {
    setSelectedMother(rabbit);
    setMotherSearch(rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code);
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
    r.id !== selectedRabbit?.id &&
    (!selectedRabbit || r.race === selectedRabbit.race)
  );

  const filteredMothers = potentialMothers.filter(r =>
    (r.code.toLowerCase().includes(motherSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(motherSearch.toLowerCase())) &&
    r.id !== selectedRabbit?.id &&
    (!selectedRabbit || r.race === selectedRabbit.race)
  );

  if (loading) return <LoadingMessage message="Cargando conejos..." />;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        <p className="text-sm font-medium text-main">
          No es necesario agregar ambos progenitores. Puedes registrar solo el padre, solo la madre, o ambos.
        </p>

        <div>
          <span className="block text-sm font-medium text-main mb-1.5">
            Conejo <span className="text-muted ml-0.5">*</span>
          </span>
          {selectedRabbit ? (
            <RabbitSelectableCard 
              rabbit={selectedRabbit} 
              onRemove={!rabbitId && !editData ? () => { setSelectedRabbit(null); setValue('rabbitId', 0 as any); setRabbitSearch(''); } : undefined} 
            />
          ) : (
            <div className="relative" ref={rabbitDropdownRef}>
              <Input
                placeholder="Buscar por código o nombre..."
                autoComplete="off"
                value={rabbitSearch}
                onChange={(e) => { setRabbitSearch(e.target.value); setShowRabbitDropdown(true); }}
                onFocus={() => setShowRabbitDropdown(true)}
                disabled={!!rabbitId || !!editData}
              />
              <DropdownPortal
                anchorRef={rabbitDropdownRef}
                open={showRabbitDropdown && filteredRabbits.length > 0 && !rabbitId && !editData}
                menuRef={rabbitMenuRef}
                maxHeight={300}
                className="bg-card border border-strong rounded-md shadow-lg p-2 flex flex-col gap-2"
              >
                {filteredRabbits.map(r => (
                  <RabbitSelectableCard
                    key={r.id}
                    rabbit={r}
                    onClick={() => handleRabbitSelect(r)}
                  />
                ))}
              </DropdownPortal>
            </div>
          )}
          {errors.rabbitId && <p className="text-sm text-red-600 mt-1">{errors.rabbitId.message}</p>}
        </div>

        <div>
          <span className="block text-sm font-medium text-muted mb-2">Padre</span>
          {selectedFather ? (
            <RabbitSelectableCard 
              rabbit={selectedFather} 
              onRemove={handleClearFather} 
            />
          ) : (
            <div className="relative" ref={fatherDropdownRef}>
              <Input
                placeholder="Buscar por código o nombre..."
                autoComplete="off"
                value={fatherSearch}
                onChange={(e) => { setFatherSearch(e.target.value); setShowFatherDropdown(true); }}
                onFocus={() => setShowFatherDropdown(true)}
              />
              <DropdownPortal
                anchorRef={fatherDropdownRef}
                open={showFatherDropdown && filteredFathers.length > 0}
                menuRef={fatherMenuRef}
                maxHeight={300}
                className="bg-card border border-strong rounded-md shadow-lg p-2 flex flex-col gap-2"
              >
                {filteredFathers.map(r => (
                  <RabbitSelectableCard
                    key={r.id}
                    rabbit={r}
                    onClick={() => handleFatherSelect(r)}
                  />
                ))}
              </DropdownPortal>
            </div>
          )}
          {errors.fatherId && <p className="text-sm text-red-600 mt-1">{errors.fatherId.message}</p>}
        </div>

        <div>
          <span className="block text-sm font-medium text-muted mb-2">Madre</span>
          {selectedMother ? (
            <RabbitSelectableCard 
              rabbit={selectedMother} 
              onRemove={handleClearMother} 
            />
          ) : (
            <div className="relative" ref={motherDropdownRef}>
              <Input
                placeholder="Buscar por código o nombre..."
                autoComplete="off"
                value={motherSearch}
                onChange={(e) => { setMotherSearch(e.target.value); setShowMotherDropdown(true); }}
                onFocus={() => setShowMotherDropdown(true)}
              />
              <DropdownPortal
                anchorRef={motherDropdownRef}
                open={showMotherDropdown && filteredMothers.length > 0}
                menuRef={motherMenuRef}
                maxHeight={300}
                className="bg-card border border-strong rounded-md shadow-lg p-2 flex flex-col gap-2"
              >
                {filteredMothers.map(r => (
                  <RabbitSelectableCard
                    key={r.id}
                    rabbit={r}
                    onClick={() => handleMotherSelect(r)}
                  />
                ))}
              </DropdownPortal>
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
        <div className="flex flex-col gap-4 text-main">
          <div className="bg-theme-surface border border-strong text-main p-4 rounded-lg flex gap-3">
            <div className="text-sm">
              <p className="mb-2"><b>El cruce de conejos de la misma familia puede causar problemas de salud en las crías.</b></p>
              <p>Lo ideal es cruzar conejos sin ningún parentesco cercano en su árbol genealógico. Esta práctica ayuda a mantener crías fuertes y asegura camadas grandes y sanas.</p>
            </div>
          </div>
          <p className="text-sm">¿Deseas proceder de todos modos con este parentesco y guardar el registro?</p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={handleCancelWarning} disabled={isConfirming}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmWarning} loading={isConfirming} disabled={isConfirming}>
              Proceder de todos modos
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
