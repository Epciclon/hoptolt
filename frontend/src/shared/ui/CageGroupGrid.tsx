import { CageGroupCard } from './CageGroupCard';
import { RabbitSelectableCard } from './RabbitSelectableCard';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';
import { ReactNode } from 'react';

export interface CageGroupGridProps {
  cageGroups: Array<{
    cageNumber: number;
    cageType: string;
    cageId: number;
    rabbits: AssignedRabbit[];
  }>;
  selectedRabbitIds: number[];
  onToggleRabbit: (rabbitId: number) => void;
  renderExtras?: (rabbit: AssignedRabbit) => ReactNode;
}

export function CageGroupGrid({
  cageGroups,
  selectedRabbitIds,
  onToggleRabbit,
  renderExtras
}: Readonly<CageGroupGridProps>) {
  if (cageGroups.length === 0) {
    return <p className="text-sm text-muted">No hay conejos con jaula asignada en el galpón activo.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {cageGroups.map(group => {
        const hasLactatingRabbit = group.rabbits.some(r => (r as any).isLactating);
        return (
          <CageGroupCard
            key={group.cageNumber}
            cageNumber={group.cageNumber}
            cageType={group.cageType}
            headerBadge={hasLactatingRabbit ? (
              <span className="px-2 py-1 bg-sky-100 text-sky-700 text-[10px] font-medium rounded-full">
                Lactancia
              </span>
            ) : undefined}
          >
            {group.rabbits.map(rabbit => {
            const isSelected = selectedRabbitIds.includes(rabbit.id);
            return (
              <RabbitSelectableCard
                key={rabbit.id}
                rabbit={rabbit}
                isSelected={isSelected}
                onClick={() => onToggleRabbit(rabbit.id)}
                extras={renderExtras ? renderExtras(rabbit) : undefined}
              />
            );
          })}
        </CageGroupCard>
        );
      })}
    </div>
  );
}
