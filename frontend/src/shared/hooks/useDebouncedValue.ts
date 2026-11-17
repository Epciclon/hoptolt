'use client';

import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor que cambia rápido (por ejemplo, búsqueda por texto)
 * para evitar disparar peticiones HTTP en cada pulsación de tecla.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
