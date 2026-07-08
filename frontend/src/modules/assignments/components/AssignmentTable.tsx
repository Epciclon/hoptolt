'use client';

import { useState, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { Button, Alert, ConfirmDialog, CageGroupCard, RabbitSelectableCard, LoadingMessage } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import { useToast } from '@/shared/contexts/ToastContext';
import { useAssignments } from '../hooks/useAssignments';
import type { Assignment } from '../types/assignment.types';

export function AssignmentTable() {
  const { assignments, loading, error, unassignRabbit } = useAssignments();
  const { showToast } = useToast();
  const [toUnassign, setToUnassign] = useState<{ cageId: number; rabbitIds: number[] } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedRabbitsByCage, setSelectedRabbitsByCage] = useState<Record<number, number[]>>({});

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 12;

  const handleConfirmUnassign = async () => {
    if (!toUnassign?.rabbitIds?.length) return;
    setProcessing(true);
    
    try {
      // Unassign all selected rabbits
      await Promise.all(toUnassign.rabbitIds.map(rabbitId => {
        const assignment = assignments.find(a => a.rabbitId === rabbitId && a.cageId === toUnassign.cageId);
        return assignment ? unassignRabbit(assignment.id) : Promise.resolve();
      }));
      
      setToUnassign(null);
      setSelectedRabbitsByCage(prev => ({ ...prev, [toUnassign.cageId]: [] }));
      showToast('Conejos desasignados exitosamente.', 'success');
    } catch (err) {
      console.error('Error al desasignar conejos:', err);
      showToast('Error al desasignar los conejos.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRabbitSelect = (cageId: number, rabbitId: number) => {
    setSelectedRabbitsByCage(prev => {
      const cageSelected = prev[cageId] || [];
      if (cageSelected.includes(rabbitId)) {
        return { ...prev, [cageId]: cageSelected.filter(id => id !== rabbitId) };
      }
      return { ...prev, [cageId]: [...cageSelected, rabbitId] };
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

  const groups = Object.entries(groupedByCage).map(([cageId, cageAssignments]) => {
    const firstAssignment = cageAssignments[0];
    return {
      cageId: Number(cageId),
      cageNumber: firstAssignment.cageNumber,
      cageType: firstAssignment.cageType || 'desconocido',
      assignments: cageAssignments
    };
  });

  // Apply filters
  const filteredGroups = groups.filter(group => {
    const title = `Jaula #${group.cageNumber} — ${group.cageType.charAt(0).toUpperCase() + group.cageType.slice(1)}`;
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase());
    const matchesType = type ? title.toLowerCase().includes(type.toLowerCase()) : true;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / limit));
  const paginatedGroups = filteredGroups.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="error" message={error} className="mb-4" />}
      
      {!loading && Object.keys(groupedByCage).length > 0 && (
        <FilterBar
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          searchPlaceholder="Buscar por N° de Jaula..."
          filters={[
            {
              key: 'type',
              placeholder: 'Filtrar por tipo',
              options: [
                { label: 'Engorde', value: 'engorde' },
                { label: 'Reproducción', value: 'reproducción' }
              ],
              value: type,
              onChange: (val) => { setType(val); setPage(1); }
            }
          ]}
        />
      )}

      {loading && (
        <LoadingMessage message="Cargando asignaciones..." />
      )}
      {!loading && Object.keys(groupedByCage).length === 0 && (
        <p className="text-sm text-slate-500 py-8">No hay conejos con jaula asignada en el galpón activo.</p>
      )}
      {!loading && Object.keys(groupedByCage).length > 0 && filteredGroups.length === 0 && (
        <p className="text-sm text-slate-500 py-8">No se encontraron jaulas con los filtros aplicados.</p>
      )}
      {!loading && Object.keys(groupedByCage).length > 0 && filteredGroups.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {paginatedGroups.map(group => {
              const selectedIds = selectedRabbitsByCage[group.cageId] || [];
              return (
                <CageGroupCard
                  key={group.cageId}
                  cageNumber={group.cageNumber as number}
                  cageType={group.cageType}
                  footer={
                    selectedIds.length > 0 ? (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<LogOut size={12} />}
                        onClick={() => handleUnassignCage(group.cageId)}
                        className="w-full animate-in fade-in slide-in-from-top-1 duration-200"
                      >
                        Desasignar ({selectedIds.length})
                      </Button>
                    ) : undefined
                  }
                >
                  <div className="space-y-3">
                    {group.assignments.map(assignment => {
                      const isSelected = selectedIds.includes(assignment.rabbitId);
                      return (
                        <RabbitSelectableCard
                          key={assignment.id}
                          rabbit={{
                            id: assignment.rabbitId,
                            code: assignment.rabbitCode || '',
                            name: assignment.rabbitName,
                            imageUrl: assignment.photoUrl,
                            age: assignment.rabbitAge,
                            weight: assignment.rabbitWeight,
                            race: assignment.rabbitRace
                          }}
                          isSelected={isSelected}
                          onClick={() => handleRabbitSelect(group.cageId, assignment.rabbitId)}
                        />
                      );
                    })}
                  </div>
                </CageGroupCard>
              );
            })}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toUnassign}
        onClose={() => setToUnassign(null)}
        onConfirm={handleConfirmUnassign}
        loading={processing}
        title={`Desasignar ${toUnassign?.rabbitIds?.length || 0} ${(() => {
          const count = toUnassign?.rabbitIds?.length || 0;
          return count === 1 ? 'conejo' : 'conejos';
        })()}`}
        description={`Los conejos seleccionados serán liberados de la jaula.`}
        confirmLabel="Sí, desasignar"
        variant="danger"
      />
    </div>
  );
}
