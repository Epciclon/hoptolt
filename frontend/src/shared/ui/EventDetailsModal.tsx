import { ReactNode } from 'react';
import { Dialog } from './Dialog';
import { formatDateTimeText } from './DateTimeBadge';
import { RabbitAvatar } from './RabbitAvatar';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {cageNumber !== undefined && cageNumber !== null && (
            <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-1">
              <p className="text-xs text-muted font-medium mb-1">Jaula</p>
              <div className="flex flex-col leading-tight mt-1">
                <span className="text-sm font-semibold text-main">
                  {cageNumber}
                </span>
              </div>
            </div>
          )}

          {primaryDateString && (
            <div className={`bg-theme-surface border border-strong rounded-lg p-3 ${
              cageNumber !== undefined && cageNumber !== null ? 'col-span-1' : 'col-span-1 sm:col-span-2'
            }`}>
              <p className="text-xs text-muted font-medium mb-1">{primaryDateLabel}</p>
              <div className="flex flex-col leading-tight mt-1">
                {(() => {
                  const result = formatDateTimeText(primaryDateString);
                  if (result === 'N/A') {
                    return <span className="text-sm font-semibold text-theme-faint">N/A</span>;
                  }
                  const { formattedDate, formattedTime } = result;
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-sm font-semibold text-main">{formattedDate}</span>
                      <span className="text-xs text-muted font-medium mt-0.5 sm:mt-0">{formattedTime}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {profile && (
            <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-1 sm:col-span-2">
              <p className="text-xs text-muted font-medium mb-1">Reportado por</p>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-main">
                  {profile.fullName || profile.username || 'Sistema'}
                </span>
                {profile.username && (
                  <span className="text-xs text-muted font-medium mt-0.5">
                    @{profile.username}
                  </span>
                )}
                {profile.email && (
                  <span className="text-xs text-theme-faint mt-0.5 break-all">
                    {profile.email}
                  </span>
                )}
              </div>
            </div>
          )}

          {customDetails}
        </div>

        {rabbits && (
          <div className="bg-theme-surface border border-strong rounded-lg p-3 mt-4">
            <p className="text-xs text-muted font-medium mb-3">{rabbitsLabel}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rabbits.length > 0 ? (
                rabbits.map((rabbit) => (
                  <div key={rabbit.code || rabbit.id} className="flex items-center gap-3 bg-card border border-default rounded-lg p-2.5">
                    <RabbitAvatar imageUrl={rabbit.imageUrl} alt="Conejo" size="md" />
                    <div className="flex flex-col leading-tight min-w-0 flex-1 gap-0.5">
                      <span className="font-semibold text-main text-sm sm:text-base truncate">
                        {rabbit.name || 'Sin nombre'}
                      </span>
                      {rabbit.code && (
                        <span className="text-xs sm:text-sm text-muted font-medium">
                          {rabbit.code}
                        </span>
                      )}
                      {rabbit.race && (
                        <span className="text-xs sm:text-sm text-muted font-medium">
                          {rabbit.race}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No hay conejos registrados</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
