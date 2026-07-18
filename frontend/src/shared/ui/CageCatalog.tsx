'use client';

import { ReactNode } from 'react';
import { CageGroupCard } from './CageGroupCard';
import { RabbitSelectableCard } from './RabbitSelectableCard';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export interface CageItem {
  cageNumber: number;
  cageType: string;
  cageId: number;
  rabbits: AssignedRabbit[];
}

export interface CageCatalogProps {
  cageGroups: CageItem[];
  selectedCageNumbers: number[];
  onToggleCage: (cageNumber: number) => void;
  renderCageContent?: (cage: CageItem) => ReactNode;
}

export function CageCatalog({
  cageGroups,
  selectedCageNumbers,
  onToggleCage,
  renderCageContent
}: Readonly<CageCatalogProps>) {
  if (cageGroups.length === 0) {
    return <p className="text-sm text-muted">No hay jaulas disponibles.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {cageGroups.map(group => {
        const isSelected = selectedCageNumbers.includes(group.cageNumber);
        const hasLactatingRabbit = group.rabbits.some(r => (r as any).isLactating);
        return (
          <CageGroupCard
            key={group.cageNumber}
            cageNumber={group.cageNumber}
            cageType={group.cageType}
            isSelected={isSelected}
            headerBadge={hasLactatingRabbit ? (
              <span className="px-2 py-1 bg-sky-100 text-sky-700 text-[10px] font-medium rounded-full">
                Lactancia
              </span>
            ) : undefined}
            onCageClick={() => onToggleCage(group.cageNumber)}
            footer={renderCageContent ? renderCageContent(group) : undefined}
          >
            <div className="flex flex-col gap-2 mt-2">
              {group.rabbits.map(rabbit => (
                <RabbitSelectableCard key={rabbit.id} rabbit={rabbit} />
              ))}
            </div>
          </CageGroupCard>
        );
      })}
    </div>
  );
}
