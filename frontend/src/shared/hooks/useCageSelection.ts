import { useState } from 'react';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useCageSelection(assignedRabbits: AssignedRabbit[]) {
  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);

  const toggleRabbit = (rabbitId: number) => {
    setSelectedRabbitIds(prev =>
      prev.includes(rabbitId)
        ? prev.filter(id => id !== rabbitId)
        : [...prev, rabbitId]
    );
  };

  const selectAllRabbits = () => {
    if (selectedRabbitIds.length === assignedRabbits.length) {
      setSelectedRabbitIds([]);
    } else {
      setSelectedRabbitIds(assignedRabbits.map(r => r.id));
    }
  };

  const clearSelection = () => {
    setSelectedRabbitIds([]);
  };

  const groupedByCage = assignedRabbits.reduce((acc, rabbit) => {
    const cageNumber = rabbit.cageNumber || 0;
    const cageId = rabbit.cageId;
    if (!acc[cageNumber]) {
      acc[cageNumber] = {
        cageNumber,
        cageType: rabbit.cageType || 'desconocido',
        cageId: cageId || 0,
        rabbits: []
      };
    }
    acc[cageNumber].rabbits.push(rabbit);
    return acc;
  }, {} as Record<number, { cageNumber: number; cageType: string; cageId: number; rabbits: AssignedRabbit[] }>);

  const cageGroups = Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);

  return {
    selectedRabbitIds,
    toggleRabbit,
    selectAllRabbits,
    clearSelection,
    cageGroups,
    isAllSelected: selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0,
  };
}
