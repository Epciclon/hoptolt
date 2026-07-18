export function groupRabbitsByCage<T extends { cageNumber?: number; cageType?: string; cageId?: number }>(rabbits: T[]) {
  return rabbits.reduce((acc, rabbit) => {
    const cageId = rabbit.cageNumber?.toString() || 'Sin asignar';
    if (!acc[cageId]) {
      acc[cageId] = {
        cageNumber: rabbit.cageNumber || 0,
        cageType: rabbit.cageType || 'desconocido',
        cageId: rabbit.cageId || 0,
        rabbits: []
      };
    }
    acc[cageId].rabbits.push(rabbit);
    return acc;
  }, {} as Record<string, { cageNumber: number; cageType: string; cageId: number; rabbits: T[] }>);
}

export const formatRabbitAge = (age: number | null | undefined) => {
  if (age === null || age === undefined) return '-';
  return `${age} ${age === 1 ? 'mes' : 'meses'}`;
};

export const rabbitSexOptions = [
  { label: 'Macho', value: 'macho' },
  { label: 'Hembra', value: 'hembra' }
];
