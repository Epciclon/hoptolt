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
    return <p className="text-sm text-slate-500">No hay jaulas disponibles.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
      {cageGroups.map(group => {
        const isSelected = selectedCageNumbers.includes(group.cageNumber);
        return (
          <CageGroupCard
            key={group.cageNumber}
            cageNumber={group.cageNumber}
            cageType={group.cageType}
            isSelected={isSelected}
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
