import { ReactNode } from 'react';

export interface DateTimeBadgeProps {
  dateString: string | null | undefined;
}

export function DateTimeBadge({ dateString }: Readonly<DateTimeBadgeProps>) {
  if (!dateString) return <span className="text-slate-500">N/A</span>;

  const date = new Date(dateString);
  const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="flex flex-col">
      <span className="text-slate-800">{formattedDate}</span>
      <span className="text-[11px] text-slate-500">{formattedTime}</span>
    </div>
  );
}

export function formatDateTimeText(dateString: string | null | undefined) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { formattedDate, formattedTime };
}
