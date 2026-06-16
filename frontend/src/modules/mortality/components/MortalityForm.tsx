'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Input, Dialog, Badge } from '@/shared/ui';
import { useMortality } from '../hooks/useMortality';
import { useToast } from '@/shared/contexts/ToastContext';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

interface MortalityFormProps {
  selectedRabbits: AssignedRabbit[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MortalityForm({ selectedRabbits, onSuccess, onCancel }: MortalityFormProps) {
  const { createMortality } = useMortality();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Modal control states
  const [isCustomCauseModalOpen, setIsCustomCauseModalOpen] = useState(false);

  // Form states
  const [deathDate, setDeathDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  });

  // Search & Select states for Cause dropdown (starts empty as requested)
  const [cause, setCause] = useState('');
  const [prevCause, setPrevCause] = useState('');
  const [causeSearch, setCauseSearch] = useState('');
  const [showCauseDropdown, setShowCauseDropdown] = useState(false);
  const [customCause, setCustomCause] = useState('');
  const [customCauseInput, setCustomCauseInput] = useState('');
  const [observations, setObservations] = useState('');

  const causeDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close cause search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (causeDropdownRef.current && !causeDropdownRef.current.contains(target)) {
        setShowCauseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmCustomCause = () => {
    const trimmed = customCauseInput.trim();
    if (trimmed) {
      setCustomCause(trimmed);
      setCause(trimmed);
      setCauseSearch(trimmed);
      setIsCustomCauseModalOpen(false);
    }
  };

  const handleCancelCustomCause = () => {
    setCause(prevCause);
    const matched = causeOptions.find(opt => opt.value === prevCause);
    setCauseSearch(matched ? matched.label : '');
    setIsCustomCauseModalOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!cause || !causeSearch.trim()) {
      showToast('Por favor, selecciona una causa de deceso de la lista.', 'error');
      setSubmitting(false);
      return;
    }

    if (!observations.trim()) {
      showToast('Las observaciones son obligatorias.', 'error');
      setSubmitting(false);
      return;
    }

    // Date validation
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const selectedDateObj = new Date(deathDate + 'T00:00:00');
    if (selectedDateObj > today) {
      showToast('La fecha de muerte no puede ser futura.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      await Promise.all(
        selectedRabbits.map(rabbit =>
          createMortality({
            rabbitId: rabbit.id,
            cause,
            observations: observations.trim(),
            deathDate,
          })
        )
      );

      showToast('Mortalidad registrada exitosamente. Los conejos han sido dados de baja.', 'success');
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado al registrar mortalidad.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cause options
  const baseCauseOptions = [
    { value: 'enfermedad', label: 'Enfermedad' },
    { value: 'accidente', label: 'Accidente' },
    { value: 'depredador', label: 'Depredador' },
    { value: 'edad', label: 'Edad' },
    { value: 'sacrificio', label: 'Sacrificio' },
    { value: 'otra', label: 'Otra (especificar causa)' }
  ];

  const causeOptions = [...baseCauseOptions];
  if (customCause && !baseCauseOptions.some(opt => opt.value === customCause)) {
    causeOptions.splice(causeOptions.length - 1, 0, {
      value: customCause,
      label: customCause // Show only the cause name directly as typed, e.g., "Gripe"
    });
  }

  const filteredCauseOptions = causeOptions.filter(opt =>
    opt.label.toLowerCase().includes(causeSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Listado de conejos con contenedor gris blanquecino y badges en azul */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Conejos a dar de baja:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {selectedRabbits.map(r => (
            <Badge
              key={r.id}
              variant="info"
            >
              {r.code} {r.name ? `(${r.name})` : ''}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Fecha de Muerte"
          type="date"
          value={deathDate}
          onChange={(e) => setDeathDate(e.target.value)}
          required
        />

        {/* Selector de Causa Search & Select */}
        <div className="relative flex flex-col gap-1.5" ref={causeDropdownRef}>
          <label className="text-sm font-medium text-slate-700">
            Causa <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Escribe para buscar o selecciona..."
            value={causeSearch}
            onChange={(e) => {
              setCauseSearch(e.target.value);
              setShowCauseDropdown(true);
            }}
            onFocus={() => setShowCauseDropdown(true)}
            required
          />
          {showCauseDropdown && (
            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredCauseOptions.length === 0 ? (
                <p className="text-slate-500 text-sm p-3">No hay opciones disponibles</p>
              ) : (
                filteredCauseOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (opt.value === 'otra') {
                        setPrevCause(cause);
                        setCustomCauseInput('');
                        setIsCustomCauseModalOpen(true);
                      } else {
                        setCause(opt.value);
                        setCauseSearch(opt.label);
                      }
                      setShowCauseDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm border-b border-slate-50 last:border-0"
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Observaciones obligatorias */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          Observaciones (¿Qué pasó?) <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          rows={3}
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Ingresa qué pasó. Ej: Murió porque tenía la barriga hinchada..."
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
        >
          {submitting ? 'Procesando...' : `Confirmar Baja (${selectedRabbits.length})`}
        </Button>
      </div>

      {/* Segundo Modal: Especificar Causa de Muerte */}
      <Dialog
        open={isCustomCauseModalOpen}
        onClose={handleCancelCustomCause}
        title="Especificar Causa de Muerte"
        description="Ingresa la causa de muerte específica"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Causa específica"
            placeholder="Ej: barriga hinchada, gripe, etc."
            value={customCauseInput}
            onChange={(e) => setCustomCauseInput(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelCustomCause}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmCustomCause}
              disabled={!customCauseInput.trim()}
            >
              Aceptar
            </Button>
          </div>
        </div>
      </Dialog>
    </form>
  );
}
