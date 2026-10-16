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

/**
 * Realiza una búsqueda inteligente por jaula o conejo:
 * - Si el query es numérico (ej: "1", "6"): busca exclusivamente por número de jaula (prioriza número exacto o inicio).
 * - Si el query contiene prefijos como "jaula X" o "j X": busca por número de jaula.
 * - Si contiene letras (código como "CON-01" o nombre como "Blanca"): busca por código o nombre del conejo.
 */
export function matchesSmartSearch(
  query: string,
  cageNumber?: number | null,
  rabbitCode?: string | null,
  rabbitName?: string | null
): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (!q) return true;

  // Solo dígitos: filtrar exclusivamente por número de jaula
  if (/^\d+$/.test(q)) {
    const targetNum = Number.parseInt(q, 10);
    if (cageNumber === targetNum) return true;
    return cageNumber !== null && cageNumber !== undefined ? cageNumber.toString().startsWith(q) : false;
  }

  // Prefijo "jaula X" o "j X"
  const cageMatch = q.match(/^(?:jaula|j)\s*(\d+)$/i);
  if (cageMatch) {
    const targetNum = Number.parseInt(cageMatch[1], 10);
    return cageNumber === targetNum;
  }

  // Alfanumérico / texto: buscar por código o nombre
  return (
    Boolean(rabbitCode?.toLowerCase().includes(q)) ||
    Boolean(rabbitName?.toLowerCase().includes(q))
  );
}
