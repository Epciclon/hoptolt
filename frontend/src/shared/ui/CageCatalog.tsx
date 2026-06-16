'use client';

import { ReactNode } from 'react';

export interface CageItem {
  cageNumber: number;
  cageType: string;
  cageId: number;
  rabbits: Array<{
    id: number;
    code: string;
    name?: string;
    age?: number;
    weight?: number;
  }>;
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
}: CageCatalogProps) {
  if (cageGroups.length === 0) {
    return <p className="text-sm text-slate-500">No hay jaulas disponibles.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cageGroups.map(group => {
        const isSelected = selectedCageNumbers.includes(group.cageNumber);
        return (
          <div
            key={group.cageNumber}
            onClick={() => onToggleCage(group.cageNumber)}
            className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${
              isSelected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-primary-300'
            }`}
          >
            <div className={`p-3 border-b ${
              isSelected ? 'border-primary-300 bg-primary-100' : 'border-slate-200 bg-slate-50'
            }`}>
              <h4 className="font-semibold text-slate-800">
                Jaula #{group.cageNumber} — {group.cageType.charAt(0).toUpperCase() + group.cageType.slice(1)}
              </h4>
            </div>
            <div className="p-3 space-y-1">
              {group.rabbits.map(rabbit => (
                <div key={rabbit.id} className="text-sm">
                  <p className="font-medium text-slate-800">
                    {rabbit.code}{rabbit.name ? ` — ${rabbit.name}` : ''}
                  </p>
                  {isSelected && (
                    <p className="text-xs text-slate-500 mt-1">
                      {rabbit.age} meses • {rabbit.weight}kg
                    </p>
                  )}
                </div>
              ))}
              {renderCageContent && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  {renderCageContent(group)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
