import { useState, useMemo } from 'react';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';
import { groupRabbitsByCage } from '@/shared/utils/rabbitUtils';

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

  const cageGroups = useMemo(() => {
    const groupedByCage = groupRabbitsByCage(assignedRabbits);
    return Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);
  }, [assignedRabbits]);

  return {
    selectedRabbitIds,
    toggleRabbit,
    selectAllRabbits,
    clearSelection,
    cageGroups,
    isAllSelected: selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0,
  };
}
