import { useState, useMemo, useEffect } from 'react';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';
import type { CageItem } from '@/shared/ui';
import { groupRabbitsByCage } from '@/shared/utils/rabbitUtils';

const DEFAULT_ITEMS_PER_PAGE = 12;

export function useCageSelection(
  assignedRabbits: AssignedRabbit[],
  searchTerm = '',
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE
) {
  // Selección por conejos individuales (usado en Vacunación, Desparasitación, Mortalidad)
  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);
  
  // Selección por jaulas completas (usado en Alimentación, Limpieza)
  const [selectedCageNumbers, setSelectedCageNumbers] = useState<number[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);

  // Agrupamiento base de todos los conejos por jaula
  const allCageGroups = useMemo<CageItem[]>(() => {
    const groupedByCage = groupRabbitsByCage(assignedRabbits);
    return Object.values(groupedByCage).sort((a, b) => a.cageNumber - b.cageNumber);
  }, [assignedRabbits]);

  // Búsqueda inteligente compartida
  const cageGroups = useMemo<CageItem[]>(() => {
    if (!searchTerm) return allCageGroups;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return allCageGroups;

    // Si la búsqueda es solo numérica (ej: "1", "6", "12"): buscar únicamente por número de jaula
    const isOnlyDigits = /^\d+$/.test(q);
    if (isOnlyDigits) {
      const targetNum = Number.parseInt(q, 10);
      const exactMatch = allCageGroups.filter(g => g.cageNumber === targetNum);
      if (exactMatch.length > 0) return exactMatch;
      return allCageGroups.filter(g => g.cageNumber.toString().startsWith(q));
    }

    // Si escribe "jaula 1", "j 1", etc.: buscar por número de jaula
    const cageMatch = q.match(/^(?:jaula|j)\s*(\d+)$/i);
    if (cageMatch) {
      const targetNum = Number.parseInt(cageMatch[1], 10);
      return allCageGroups.filter(g => g.cageNumber === targetNum);
    }

    // Si contiene letras (nombre del conejo o código como "CON-01", "H-1"):
    return allCageGroups.filter(g =>
      g.rabbits.some(r =>
        Boolean(r.name?.toLowerCase().includes(q)) ||
        Boolean(r.code?.toLowerCase().includes(q))
      )
    );
  }, [allCageGroups, searchTerm]);

  // Regresar a página 1 cuando cambie el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(cageGroups.length / itemsPerPage) || 1;
  const paginatedGroups = cageGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Métodos de selección por conejo
  const toggleRabbit = (rabbitId: number) => {
    setSelectedRabbitIds(prev =>
      prev.includes(rabbitId)
        ? prev.filter(id => id !== rabbitId)
        : [...prev, rabbitId]
    );
  };

  const selectAllRabbits = () => {
    if (selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0) {
      setSelectedRabbitIds([]);
    } else {
      setSelectedRabbitIds(assignedRabbits.map(r => r.id));
    }
  };

  // Métodos de selección por jaula
  const toggleCage = (cageNumber: number) => {
    setSelectedCageNumbers(prev =>
      prev.includes(cageNumber)
        ? prev.filter(n => n !== cageNumber)
        : [...prev, cageNumber]
    );
  };

  const selectAllCages = () => {
    if (selectedCageNumbers.length === cageGroups.length && cageGroups.length > 0) {
      setSelectedCageNumbers([]);
    } else {
      setSelectedCageNumbers(cageGroups.map(g => g.cageNumber));
    }
  };

  const clearSelection = () => {
    setSelectedRabbitIds([]);
    setSelectedCageNumbers([]);
  };

  const isAllRabbitsSelected = selectedRabbitIds.length === assignedRabbits.length && assignedRabbits.length > 0;
  const isAllCagesSelected = selectedCageNumbers.length === cageGroups.length && cageGroups.length > 0;

  return {
    // Selección de conejos
    selectedRabbitIds,
    setSelectedRabbitIds,
    toggleRabbit,
    selectAllRabbits,
    isAllSelected: isAllRabbitsSelected,
    isAllRabbitsSelected,

    // Selección de jaulas
    selectedCageNumbers,
    setSelectedCageNumbers,
    toggleCage,
    selectAllCages,
    isAllCagesSelected,

    // Común
    clearSelection,
    allCageGroups,
    cageGroups,
    paginatedGroups,
    currentPage,
    totalPages,
    setCurrentPage,
  };
}
