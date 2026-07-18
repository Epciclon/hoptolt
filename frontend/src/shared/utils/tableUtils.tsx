import type { Column } from '@/shared/ui/Table';
import { DateTimeBadge } from '@/shared/ui';

export function getRabbitEventBaseColumns<T extends { rabbit?: { name?: string | null; code: string; race?: string | null; } | null; rabbitCode?: string; profile?: { fullName?: string | null; username?: string | null; } | null; }>(dateKey: keyof T): Column<T>[] {
  return [
    {
      key: 'rabbit',
      header: 'Conejo',
      className: 'font-medium text-main',
      render: (row) => row.rabbit ? (
        <div className="flex flex-col">
          <span className="text-main font-medium">{row.rabbit.name || 'Sin nombre'}</span>
          <span className="text-[11px] text-muted">{row.rabbit.code}</span>
        </div>
      ) : row.rabbitCode
    },
    {
      key: 'race',
      header: 'Raza',
      className: 'text-muted',
      render: (row) => row.rabbit?.race || 'N/A'
    },

    {
      key: 'date',
      header: 'Fecha y Hora',
      render: (row) => <DateTimeBadge dateString={row[dateKey] as unknown as string} />
    }
  ];
}
