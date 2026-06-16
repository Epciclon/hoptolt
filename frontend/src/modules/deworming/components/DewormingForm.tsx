'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Input, Button, Alert } from '@/shared/ui';
import { dewormingService } from '../services/deworming.service';

const schema = z.object({
  rabbitCodes: z.array(z.string()).min(1, 'Selecciona al menos un conejo'),
});

type FormValues = z.infer<typeof schema>;

interface DewormingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DewormingForm({ onSuccess, onCancel }: DewormingFormProps) {
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rabbitInput, setRabbitInput] = useState('');
  const [selectedRabbits, setSelectedRabbits] = useState<string[]>([]);

  const { handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rabbitCodes: [],
    },
  });

  const addRabbit = () => {
    if (rabbitInput && !selectedRabbits.includes(rabbitInput)) {
      setSelectedRabbits([...selectedRabbits, rabbitInput]);
      setRabbitInput('');
    }
  };

  const removeRabbit = (code: string) => {
    setSelectedRabbits(selectedRabbits.filter(r => r !== code));
  };

  const onSubmit = async () => {
    setServerError('');
    setSuccessMsg('');
    if (selectedRabbits.length === 0) {
      setServerError('Selecciona al menos un conejo');
      return;
    }
    try {
      await dewormingService.create({ rabbitIds: selectedRabbits.map(Number) });
      setSuccessMsg('Desparasitación registrada exitosamente.');
      setSelectedRabbits([]);
      setTimeout(() => onSuccess?.(), 1000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="error" message={serverError} onClose={() => setServerError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} />}

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Conejos</label>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Código del conejo (ej: R001)"
            value={rabbitInput}
            onChange={(e) => setRabbitInput(e.target.value)}
          />
          <Button type="button" onClick={addRabbit} variant="secondary">
            Agregar
          </Button>
        </div>
        {selectedRabbits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedRabbits.map(code => (
              <div key={code} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {code}
                <button
                  type="button"
                  onClick={() => removeRabbit(code)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {errors.rabbitCodes && <p className="text-sm text-red-600 mt-1">{errors.rabbitCodes.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          Registrar Desparasitación
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
