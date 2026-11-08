export interface GrowthSummaryItem {
  key: string;
  name: string;
  ageBadge: string;
  weightBadge?: string;
  isMature?: boolean;
  badge: string;
}

export interface GrowthSummaryViewData {
  summaryMessage: string;
  items: GrowthSummaryItem[];
}

const DEFAULT_WEIGHT_BY_MONTH: Record<number, number> = {
  1: 0.6,
  2: 1.7,
  3: 2.6,
  4: 3.5,
  5: 3.9,
  6: 4.1,
  7: 4.2,
  8: 4.2,
};

function formatWeightBadge(weight: unknown): string | undefined {
  if (weight === undefined || weight === null || weight === '') return undefined;
  const num = Number(weight);
  if (Number.isNaN(num) || num <= 0) return undefined;
  return `${num} kg`;
}

function parseLegacyGrowthDetailLine(line: string, index: number): GrowthSummaryItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const regex = /^(.+?)\s+ha alcanzado los?\s+(\d+)\s+mes(?:es)?(?:\s+de edad)?\.?(.*)$/i;
  const match = regex.exec(trimmed);
  if (match) {
    const name = match[1].trim();
    const months = Number.parseInt(match[2], 10);
    const tail = match[3] || '';
    const isMature = tail.toLowerCase().includes('madurez');
    const weightMatch = /(\d+(?:\.\d+)?)\s*kg/i.exec(tail);
    const fallbackWeight = months >= 8 ? 4.2 : DEFAULT_WEIGHT_BY_MONTH[months];
    const resolvedWeight = weightMatch ? Number(weightMatch[1]) : fallbackWeight;
    const ageBadge = months === 1 ? '1 mes' : `${months} meses`;
    const weightBadge = formatWeightBadge(resolvedWeight);
    const baseBadge = weightBadge ? `${ageBadge} • ${weightBadge}` : `${ageBadge} de edad`;
    return {
      key: `${name}-${index}`,
      name,
      ageBadge,
      weightBadge,
      isMature,
      badge: isMature ? `${baseBadge} • Madurez` : baseBadge,
    };
  }

  return {
    key: `growth-${index}`,
    name: trimmed,
    ageBadge: 'Actualizado',
    badge: 'Actualizado',
  };
}

function mapRawGrowthRabbit(r: any, idx: number): GrowthSummaryItem {
  const ageVal = Number(r.age || 0);
  const ageBadge = ageVal === 1 ? '1 mes' : `${ageVal} meses`;
  const fallbackWeight = ageVal >= 8 ? 4.2 : DEFAULT_WEIGHT_BY_MONTH[ageVal];
  const weightBadge = formatWeightBadge(r.weight ?? fallbackWeight);
  const isMature = Boolean(r.isMature);
  const baseBadge = weightBadge ? `${ageBadge} • ${weightBadge}` : `${ageBadge} de edad`;
  return {
    key: String(r.rabbitId || `${r.name}-${idx}`),
    name: r.name || 'Conejo',
    ageBadge,
    weightBadge,
    isMature,
    badge: r.badge || (isMature ? `${baseBadge} • Madurez` : baseBadge),
  };
}

export function extractGrowthSummaryData(notification: any): GrowthSummaryViewData | null {
  const isGrowthSummary =
    notification?.data?.type === 'growth_summary' ||
    notification?.title === 'Resumen de Crecimiento';

  if (!isGrowthSummary) return null;

  const rawRabbits = notification?.data?.rabbits;
  let items: GrowthSummaryItem[] = [];

  if (Array.isArray(rawRabbits) && rawRabbits.length > 0) {
    items = rawRabbits.map((r: any, idx: number) => mapRawGrowthRabbit(r, idx));
  } else {
    const rawLines: string[] =
      Array.isArray(notification?.data?.details) && notification.data.details.length > 0
        ? notification.data.details
        : String(notification?.message || '').split('\n');

    items = rawLines
      .map((line, idx) => parseLegacyGrowthDetailLine(line, idx))
      .filter((item): item is GrowthSummaryItem => item !== null);
  }

  const count = items.length || Number(notification?.data?.updatesCount || 0);
  const rawMessage = String(notification?.message || '');
  const isLegacyRawMessage = rawMessage.includes('ha alcanzado los') || rawMessage.includes('ha alcanzado el');

  let summaryMessage = rawMessage;
  if (isLegacyRawMessage && count > 0) {
    summaryMessage =
      count === 1
        ? 'Tienes **1 conejo** con actualización de edad y peso estimado en tu galpón.'
        : `Tienes **${count} conejos** con actualización de edad y peso estimado en tu galpón.`;
  }

  return {
    summaryMessage,
    items,
  };
}

