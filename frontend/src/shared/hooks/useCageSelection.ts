import { useState, useMemo } from 'react';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';
import { groupRabbitsByCage } from '@/shared/utils/rabbitUtils';

const ITEMS_PER_PAGE = 12;

export function useCageSelection(assignedRabbits: AssignedRabbit[], searchTerm = '') {
  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

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
    const allGroups = Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);
    if (!searchTerm) return allGroups;
    const q = searchTerm.toLowerCase();
    return allGroups.filter(g =>
      g.cageNumber.toString().includes(q) ||
      g.rabbits.some(r =>
        Boolean(r.name?.toLowerCase().includes(q)) ||
        Boolean(r.code?.toLowerCase().includes(q))
      )
    );
  }, [assignedRabbits, searchTerm]);

  // Regresar a página 1 si cambia la búsqueda
  useMemo(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(cageGroups.length / ITEMS_PER_PAGE) || 1;
  const paginatedGroups = cageGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return {
    selectedRabbitIds,
    toggleRabbit,
    selectAllRabbits,
    clearSelection,
    cageGroups,
    paginatedGroups,
    currentPage,
    totalPages,
    setCurrentPage,
    isAllSelected: selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0,
  };
}
