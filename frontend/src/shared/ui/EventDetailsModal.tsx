import { ReactNode } from 'react';
import { Dialog } from './Dialog';
import { formatDateTimeText } from './DateTimeBadge';

export interface ProfileInfo {
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface RabbitInfo {
  id?: number;
  code?: string | null;
  name?: string | null;
  race?: string | null;
  imageUrl?: string | null;
}

export interface EventDetailsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  primaryDateString?: string | null;
  primaryDateLabel?: string;
  profile?: ProfileInfo | null;
  rabbits?: RabbitInfo[] | null;
  rabbitsLabel?: string;
  customDetails?: ReactNode;
  cageNumber?: number | string | null;
}

export function EventDetailsModal({
  open,
  onClose,
  title,
  description,
  primaryDateString,
  primaryDateLabel = "Fecha y Hora",
  profile,
  rabbits,
  rabbitsLabel = "Conejos en el evento",
  customDetails,
  cageNumber
}: Readonly<EventDetailsModalProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
    >
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          
          {cageNumber !== undefined && cageNumber !== null && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">Jaula</p>
              <div className="flex flex-col leading-tight mt-1">
                <span className="text-sm font-semibold text-slate-800">
                  {cageNumber}
                </span>
              </div>
            </div>
          )}

          {primaryDateString && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">{primaryDateLabel}</p>
              <div className="flex flex-col leading-tight mt-1">
                {(() => {
                  const result = formatDateTimeText(primaryDateString);
                  if (result === 'N/A') {
                    return <span className="text-sm font-semibold text-slate-400">N/A</span>;
                  }
                  const { formattedDate, formattedTime } = result;
                  return (
                    <>
                      <span className="text-sm font-semibold text-slate-800">{formattedDate}</span>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">{formattedTime}</span>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {profile && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">Reportado por</p>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-slate-800">
                  {profile.fullName || profile.username || 'Sistema'}
                </span>
                {profile.username && (
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                    @{profile.username}
                  </span>
                )}
                {profile.email && (
                  <span className="text-[10px] text-slate-400 mt-0.5 break-all">
                    {profile.email}
                  </span>
                )}
              </div>
            </div>
          )}

          {customDetails}
        </div>

        {rabbits && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-slate-500 font-medium mb-3">{rabbitsLabel}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rabbits.length > 0 ? (
                rabbits.map((rabbit) => (
                  <div key={rabbit.code || rabbit.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg p-2">
                    {rabbit.imageUrl ? (
                      <img 
                        src={rabbit.imageUrl} 
                        alt="Conejo" 
                        className="w-10 h-10 flex-shrink-0 rounded-full object-cover shadow-sm border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 text-[9px] text-center leading-tight px-1">
                        Sin foto
                      </div>
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-slate-800 text-sm">
                        {rabbit.name || 'Sin nombre'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {rabbit.code}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {rabbit.race || 'Raza N/A'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No hay conejos registrados</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
