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

function extractWeightFromTail(tail: string): number | undefined {
  const lowerTail = tail.toLowerCase();
  const kgIdx = lowerTail.indexOf('kg');
  if (kgIdx <= 0) return undefined;
  const beforeKg = tail.slice(0, kgIdx).trimEnd();
  const lastSep = Math.max(beforeKg.lastIndexOf(' '), beforeKg.lastIndexOf('•'));
  const candidate = beforeKg.slice(lastSep + 1).trim();
  const parsed = Number(candidate);
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

function buildMatchedGrowthItem(
  name: string,
  afterMarker: string,
  mesIdx: number,
  digitMatch: RegExpExecArray,
  index: number
): GrowthSummaryItem {
  const months = Number.parseInt(digitMatch[0], 10);
  const tail = afterMarker.slice(mesIdx);
  const isMature = tail.toLowerCase().includes('madurez');
  const extractedWeight = extractWeightFromTail(tail);
  const fallbackWeight = months >= 8 ? 4.2 : DEFAULT_WEIGHT_BY_MONTH[months];
  const resolvedWeight = extractedWeight ?? fallbackWeight;
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

function parseLegacyGrowthDetailLine(line: string, index: number): GrowthSummaryItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const marker = ' ha alcanzado ';
  const markerIdx = lower.indexOf(marker);
  if (markerIdx > 0) {
    const name = trimmed.slice(0, markerIdx).trim();
    const afterMarker = trimmed.slice(markerIdx + marker.length).trim();
    const mesIdx = afterMarker.toLowerCase().indexOf('mes');
    const digitMatch = mesIdx > 0 ? /\d+/.exec(afterMarker.slice(0, mesIdx)) : null;

    if (digitMatch) {
      return buildMatchedGrowthItem(name, afterMarker, mesIdx, digitMatch, index);
    }
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

export function isWarningNotification(n: any): boolean {
  const t = n.data?.type;
  if (t === 'incident' || t === 'incident_response') return false;
  const title = (n.title || '').toLowerCase();
  const msg = (n.message || '').toLowerCase();
  if (title.includes('novedad') || msg.includes('novedad')) return false;

  return (
    n.type === 'warning' ||
    t === 'feeding_reminder' ||
    t === 'cleaning_warning' ||
    t === 'birth_warning' ||
    t === 'weaning_alert'
  );
}

export function sortNotificationsByRecent<T extends { updatedAt?: string; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

export function isPreviewKeySeenOrDismissed(userId: string, versionKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const seenKey = `hoptolt_prev_seen_${userId}_${versionKey}`;
  const dismissedKey = `hoptolt_prev_dismissed_${userId}_${versionKey}`;
  return (
    sessionStorage.getItem(seenKey) === 'true' ||
    localStorage.getItem(seenKey) === 'true' ||
    sessionStorage.getItem(dismissedKey) === 'true' ||
    localStorage.getItem(dismissedKey) === 'true'
  );
}

export function markPreviewKeyState(userId: string, versionKey: string, state: 'seen' | 'dismissed'): void {
  if (typeof window === 'undefined') return;
  const key = `hoptolt_prev_${state}_${userId}_${versionKey}`;
  sessionStorage.setItem(key, 'true');
  localStorage.setItem(key, 'true');
}

