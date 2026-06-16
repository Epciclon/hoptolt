'use client';

import { useState, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { Button, Alert, ConfirmDialog, CardGroup } from '@/shared/ui';
import { useAssignments } from '../hooks/useAssignments';
import type { Assignment } from '../types/assignment.types';

export function AssignmentTable() {
  const { assignments, loading, error, unassignRabbit } = useAssignments();
  const [toUnassign, setToUnassign] = useState<{ cageId: number; rabbitIds: number[] } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedRabbitsByCage, setSelectedRabbitsByCage] = useState<Record<number, number[]>>({});

  const handleConfirmUnassign = async () => {
    if (!toUnassign || !toUnassign.rabbitIds || toUnassign.rabbitIds.length === 0) return;
    setProcessing(true);
    
    // Unassign all selected rabbits
    await Promise.all(toUnassign.rabbitIds.map(rabbitId => {
      const assignment = assignments.find(a => a.rabbitId === rabbitId && a.cageId === toUnassign.cageId);
      return assignment ? unassignRabbit(assignment.id) : Promise.resolve();
    }));
    
    setProcessing(false);
    setToUnassign(null);
    setSelectedRabbitsByCage(prev => ({ ...prev, [toUnassign.cageId]: [] }));
  };

  const handleRabbitSelect = (cageId: number, rabbitId: number) => {
    setSelectedRabbitsByCage(prev => {
      const current = prev[cageId] || [];
      const isSelected = current.includes(rabbitId);
      const updated = isSelected 
        ? current.filter(id => id !== rabbitId)
        : [...current, rabbitId];
      return { ...prev, [cageId]: updated };
    });
  };

  const handleUnassignCage = (cageId: number) => {
    const selectedIds = selectedRabbitsByCage[cageId] || [];
    if (selectedIds.length === 0) return;
    setToUnassign({ cageId, rabbitIds: selectedIds });
  };

  // Group assignments by cage
  const groupedByCage = useMemo(() => {
    const groups: Record<number, Assignment[]> = {};
    assignments.forEach(assignment => {
      if (!groups[assignment.cageId]) {
        groups[assignment.cageId] = [];
      }
      groups[assignment.cageId].push(assignment);
    });
    return groups;
  }, [assignments]);

  const cardItems = Object.entries(groupedByCage).map(([cageId, cageAssignments]) => {
    const firstAssignment = cageAssignments[0];
    const cageNumber = firstAssignment.cageNumber;
    const cageType = firstAssignment.cageType || 'desconocido';
    const selectedIds = selectedRabbitsByCage[Number(cageId)] || [];
    
    return {
      id: cageId,
      title: `Jaula #${cageNumber} — ${cageType.charAt(0).toUpperCase() + cageType.slice(1)}`,
      subtitle: '',
      actions: (
        <div className="flex flex-col gap-2 w-full">
          {cageAssignments.map(assignment => {
            const isSelected = selectedIds.includes(assignment.rabbitId);
            return (
              <div
                key={assignment.id}
                onClick={() => handleRabbitSelect(Number(cageId), assignment.rabbitId)}
                className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {assignment.rabbitCode}{assignment.rabbitName ? ` — ${assignment.rabbitName}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
          <Button
            variant="warning"
            size="sm"
            icon={<LogOut size={12} />}
            onClick={() => handleUnassignCage(Number(cageId))}
            className="w-full mt-2"
            disabled={selectedIds.length === 0}
          >
            Desasignar ({selectedIds.length})
          </Button>
        </div>
      ),
    };
  });

  return (
    <>
      {error && <Alert variant="error" message={error} className="mb-4" />}
      {loading ? (
        <p className="text-center text-slate-500 py-8">Cargando asignaciones...</p>
      ) : (
        <CardGroup
          title="Asignaciones de Conejos"
          subtitle="Gestiona qué conejo está en cada jaula"
          items={cardItems}
        />
      )}
      <ConfirmDialog
        open={!!toUnassign}
        onClose={() => setToUnassign(null)}
        onConfirm={handleConfirmUnassign}
        loading={processing}
        title={`Desasignar ${toUnassign?.rabbitIds?.length || 0} conejo${(toUnassign?.rabbitIds?.length || 0) > 1 ? 's' : ''}`}
        description={`Los conejos seleccionados serán liberados de la jaula.`}
        confirmLabel="Sí, desasignar"
        variant="warning"
      />
    </>
  );
}
