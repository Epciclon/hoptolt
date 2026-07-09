'use client';

import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

export interface RabbitMultiSelectFieldProps {
  selectedRabbits: string[];
  onChange: (rabbits: string[]) => void;
  error?: string;
  label?: string;
  placeholder?: string;
}

export function RabbitMultiSelectField({
  selectedRabbits,
  onChange,
  error,
  label = "Conejos",
  placeholder = "Código del conejo (ej: R001)"
}: Readonly<RabbitMultiSelectFieldProps>) {
  const [rabbitInput, setRabbitInput] = useState('');

  const addRabbit = () => {
    if (rabbitInput && !selectedRabbits.includes(rabbitInput)) {
      onChange([...selectedRabbits, rabbitInput]);
      setRabbitInput('');
    }
  };

  const removeRabbit = (code: string) => {
    onChange(selectedRabbits.filter(r => r !== code));
  };

  return (
    <div>
      {label && <span className="block text-sm font-medium text-slate-600 mb-2">{label}</span>}
      <div className="flex gap-2 mb-2">
        <Input
          placeholder={placeholder}
          value={rabbitInput}
          onChange={(e) => setRabbitInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addRabbit();
            }
          }}
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
                className="text-blue-600 hover:text-blue-900 focus:outline-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
