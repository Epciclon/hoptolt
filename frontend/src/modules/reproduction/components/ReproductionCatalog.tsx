'use client';

import { useReproduction } from '../hooks/useReproduction';
import type { Reproduction } from '../types/reproduction.types';
import { Button, ConfirmDialog, Dialog } from '@/shared/ui';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { ReproductionForm } from './ReproductionForm';
import { useToast } from '@/shared/contexts/ToastContext';

interface ReproductionCatalogProps {
  onSuccess?: () => void;
}

export function ReproductionCatalog({ onSuccess }: ReproductionCatalogProps) {
  const { reproductions, loading, deleteReproduction, fetchReproductions } = useReproduction();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Reproduction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingReproduction, setEditingReproduction] = useState<Reproduction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      return formattedDate;
    }
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete || !toDelete.id) return;
    setDeleting(true);
    const success = await deleteReproduction(toDelete.id);
    setDeleting(false);
    
    if (success) {
      setToDelete(null);
      showToast('Monta eliminada correctamente.', 'success');
      onSuccess?.();
    } else {
      showToast('Error al eliminar la monta.', 'error');
    }
  };

  if (loading) {
    return <p className="text-center text-slate-500 py-8">Cargando datos de reproducción...</p>;
  }

  return (
    <>
      {reproductions.length === 0 ? (
        <p className="text-sm text-slate-500">No hay montas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reproductions.map((reproduction) => {
            const isExpanded = expandedId === reproduction.id;
            return (
              <div
                key={reproduction.id}
                onClick={() => setExpandedId(isExpanded ? null : reproduction.id)}
                className={`border rounded-lg overflow-hidden transition-all duration-150 cursor-pointer ${
                  isExpanded ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <div className={`p-3 border-b ${
                  isExpanded ? 'border-primary-300 bg-primary-100' : 'border-slate-200 bg-slate-50'
                }`}>
                  <h4 className="font-semibold text-slate-800 text-sm">
                    Jaula #{reproduction.cageNumber || 'N/A'} — {capitalizeType(reproduction.cageType || 'Reproducción')}
                  </h4>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {reproduction.femaleCode}{reproduction.femaleName ? ` — ${reproduction.femaleName}` : ''}
                    </p>
                  </div>
                  {isExpanded && reproduction.maleCode && (
                    <div className="pt-2 border-t border-slate-100 animate-fade-in">
                      <p className="text-xs font-semibold text-slate-600">
                        Última pareja:
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {reproduction.maleCode}{reproduction.maleName ? ` — ${reproduction.maleName}` : ''}
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">
                      Fecha de monta:
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatDateTime(reproduction.mountDate)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">
                      Fecha estimada de parto:
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatDateTime(reproduction.estimatedBirthDate)}
                    </p>
                  </div>
                  {isExpanded && (
                    <div 
                      className="flex gap-2 pt-3 border-t border-slate-100 mt-2 animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => {
                          setEditingReproduction(reproduction);
                          setShowEditModal(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => setToDelete(reproduction)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Eliminar monta de ${toDelete?.femaleCode}${toDelete?.femaleName ? ` — ${toDelete.femaleName}` : ''}`}
        description="Esta acción eliminará permanentemente el registro de monta del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
      />

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingReproduction(null);
        }}
        title={`Editar monta de ${editingReproduction?.femaleCode}${editingReproduction?.femaleName ? ` — ${editingReproduction.femaleName}` : ''}`}
        size="xl"
      >
        {editingReproduction && (
          <ReproductionForm
            editingReproduction={editingReproduction}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingReproduction(null);
              fetchReproductions();
              onSuccess?.();
            }}
            onCancel={() => {
              setShowEditModal(false);
              setEditingReproduction(null);
            }}
          />
        )}
      </Dialog>
    </>
  );
}
