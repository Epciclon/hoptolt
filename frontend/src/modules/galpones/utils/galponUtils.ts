import type { Column } from '@/shared/ui/Table';
import type { Galpon } from '../types/galpon.types';

export function getGalponBaseColumns(): Column<Galpon>[] {
  return [
    { key: 'name', header: 'Nombre' },
    { key: 'location', header: 'Ubicación' },
    { key: 'totalCapacity', header: 'Capacidad Total' },
  ];
}
