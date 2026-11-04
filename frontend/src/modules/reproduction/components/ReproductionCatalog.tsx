'use client';

import { useReproduction } from '../hooks/useReproduction';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import type { Reproduction } from '../types/reproduction.types';
import { Dialog, Select, RabbitSelectableCard, CageGroupCard, Button, RabbitAvatar } from '@/shared/ui';
import { useState, useMemo, useEffect } from 'react';
import { Calendar, Info, Heart } from 'lucide-react';
import { ReproductionForm } from './ReproductionForm';
import { useToast } from '@/shared/contexts/ToastContext';
import { Input } from '@/shared/ui/Input';
import { useMortality } from '@/modules/mortality/hooks/useMortality';
import { formatDateString } from '@/shared/utils/dateUtils';
import { matchesSmartSearch } from '@/shared/utils/rabbitUtils';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface ReproductionCatalogProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function ReproductionCatalog({ searchTerm, onSearchChange }: Readonly<ReproductionCatalogProps>) {
  const { reproductions, cancelReproduction, registerBirth, fetchReproductions } = useReproduction({ status: 'gestacion', limit: 1000 });
  const { createMortality } = useMortality({ enabled: false });
  const onSuccess = fetchReproductions;
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canCreate = can('reproduction', 'canCreate');
  const canUpdate = can('reproduction', 'canUpdate');
  const canDelete = can('reproduction', 'canDelete');
  const [page, setPage] = useState(1);
  const limit = 12;

  const [toCancel, setToCancel] = useState<Reproduction | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelReasonOther, setCancelReasonOther] = useState<string>('');
  
  const [toRegisterBirth, setToRegisterBirth] = useState<Reproduction | null>(null);
  const [actualBirthDate, setActualBirthDate] = useState<string>('');
  const [registeringBirth, setRegisteringBirth] = useState(false);

  const [editingReproduction, setEditingReproduction] = useState<Reproduction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<Reproduction | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [filterRace, setFilterRace] = useState('');

  const formatDateTime = formatDateString;

  const handleConfirmCancel = async () => {
    if (!toCancel?.id || !cancelReason) return;
    
    let action: 'delete' | 'fail' = 'delete';
    let finalReason = cancelReason;

    if (cancelReason === 'muerte' || cancelReason === 'otro') {
        action = 'fail';
        if (cancelReason === 'otro') {
            if (!cancelReasonOther.trim()) {
                showToast('Debe especificar la razón.', 'error');
                return;
            }
            finalReason = cancelReasonOther;
        }
    }

    setCanceling(true);
    try {
      if (cancelReason === 'muerte') {
        // Registrar mortalidad de la coneja (esto libera la jaula y hace softdelete)
        await createMortality({
            rabbitId: toCancel.femaleId,
            cause: 'otra',
            observations: 'Muerte durante la gestación',
            deathDate: new Date().toISOString()
        });
      }

      await cancelReproduction(toCancel.id, action, finalReason);
      
      setToCancel(null);
      setCancelReason('');
      setCancelReasonOther('');
      showToast(action === 'delete' ? 'Monta eliminada correctamente.' : 'Cancelación registrada en el historial.', 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al cancelar la monta.', 'error');
    } finally {
      setCanceling(false);
    }
  };

  const handleRegisterBirth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toRegisterBirth || !actualBirthDate) return;
    
    setRegisteringBirth(true);
    try {
      await registerBirth(toRegisterBirth.id, { actualBirthDate });
      setToRegisterBirth(null);
      setActualBirthDate('');
      showToast('Parto registrado exitosamente. La coneja pasó a Fase 3.', 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al registrar el parto.', 'error');
    } finally {
      setRegisteringBirth(false);
    }
  };

  const isBirthDateReached = (dateString: string) => {
      const parts = dateString.split('-');
      if (parts.length !== 3) return false;
      const birthDate = new Date(Number.parseInt(parts[0]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[2]));
      
      const ecuadorDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      ecuadorDate.setHours(0, 0, 0, 0);
      birthDate.setHours(0, 0, 0, 0);
      
      return ecuadorDate >= birthDate;
  };

  const getDaysInGestation = (estimatedBirthDate: string) => {
    const parts = estimatedBirthDate.split('-');
    if (parts.length !== 3) return { days: 0, daysLeft: 0 };
    const birthDate = new Date(Number.parseInt(parts[0]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[2]));
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    today.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((birthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const days = 30 - daysLeft; // 30 = periodo estandar de gestacion
    return { days: Math.max(0, days), daysLeft: Math.max(0, daysLeft) };
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterRace]);

  const gestaciones = reproductions.filter(r => {
    if (r.status !== 'gestacion') return false;
    if (r.isFemaleDeleted) return false;
    if (filterRace && r.femaleRace !== filterRace) return false;
    return matchesSmartSearch(searchTerm, r.cageNumber, r.femaleCode, r.femaleName);
  });

  const uniqueRaces = Array.from(new Set(reproductions.filter(r => r.status === 'gestacion' && r.femaleRace).map(r => r.femaleRace)));

  type GroupedGestacion = { cageNumber: number; cageType: string; reproductions: typeof gestaciones };
  const groupedGestaciones = useMemo(() => {
    const map = gestaciones.reduce((acc, reproduction) => {
      const cageNumber = reproduction.cageNumber || 0;
      if (!acc[cageNumber]) {
        acc[cageNumber] = { cageNumber, cageType: reproduction.cageType || 'reproducción', reproductions: [] };
      }
      acc[cageNumber].reproductions.push(reproduction);
      return acc;
    }, {} as Record<number, GroupedGestacion>);
    return Object.values(map).sort((a, b) => a.cageNumber - b.cageNumber);
  }, [gestaciones]);

  const paginatedGroups = useMemo(() => {
    return groupedGestaciones.slice((page - 1) * limit, page * limit);
  }, [groupedGestaciones, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-sm sm:text-base font-medium text-main">Conejas gestantes con fecha estimada de parto. Al registrar el parto, la coneja avanzará automáticamente a la fase de lactancia.</p>
      </div>
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          onSearchChange(val);
          setPage(1);
        }}
        searchPlaceholder="Buscar por nombre, código o jaula..."
        filters={[
          {
            key: 'race',
            placeholder: 'Todas las razas',
            options: uniqueRaces.map((race) => ({
              value: race as string,
              label: String(race).charAt(0).toUpperCase() + String(race).slice(1)
            })),
            value: filterRace,
            onChange: setFilterRace
          }
        ]}
      />

      {gestaciones.length === 0 ? (
        <p className="text-sm text-muted bg-theme-surface p-4 rounded-lg border border-default">
          No hay conejas en etapa de gestación que coincidan con los filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {paginatedGroups.map(group => (
            <CageGroupCard 
              key={group.cageNumber} 
              cageNumber={group.cageNumber} 
              cageType={group.cageType}
              headerBadge={
                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full whitespace-nowrap">
                  Gestación
                </span>
              }
            >
                {group.reproductions.map(reproduction => {
                  const isExpanded = expandedId === reproduction.id;
                  const { daysLeft } = getDaysInGestation(reproduction.estimatedBirthDate);
                  const nearBirth = daysLeft >= 0 && daysLeft <= 3;

                  return (
              <RabbitSelectableCard
                key={reproduction.id}
                rabbit={{
                  id: reproduction.femaleId,
                  code: reproduction.femaleCode,
                  name: reproduction.femaleName,
                  race: reproduction.femaleRace,
                  imageUrl: reproduction.imageUrl,
                  cageNumber: reproduction.cageNumber,
                  age: reproduction.femaleAge,
                  weight: reproduction.femaleWeight
                }}
                isSelected={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : reproduction.id)}
              >

                <div className="space-y-2 mt-2 text-xs">
                  {(() => {
                    const progressPercent = Math.min(100, Math.max(0, Math.round(((30 - Math.max(0, daysLeft)) / 30) * 100)));
                    return (
                      <div className="p-2.5 rounded-lg border bg-theme-surface border-default transition-colors">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-semibold text-main">
                            Gestación
                          </span>
                          <span className="font-bold text-main">
                            Día {30 - Math.max(0, daysLeft)} de 30
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              nearBirth ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-default/40 flex flex-col gap-0.5">
                          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
                            <Calendar size={13} className="opacity-70 shrink-0" />
                            Parto estimado
                          </span>
                          <span className="text-sm sm:text-base font-bold text-main">
                            {formatDateTime(reproduction.estimatedBirthDate)}
                          </span>
                          {daysLeft === 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-default/30 text-center">
                              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                ¡Parto estimado hoy!
                              </span>
                            </div>
                          )}
                          {nearBirth && daysLeft > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-default/30 text-center">
                              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                Parto estimado en {daysLeft} día{daysLeft !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {isExpanded && (
                  <div 
                    className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {canCreate && (
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setToRegisterBirth(reproduction);
                          const ecuadorDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
                          const y = ecuadorDate.getFullYear();
                          const m = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
                          const d = String(ecuadorDate.getDate()).padStart(2, '0');
                          setActualBirthDate(`${y}-${m}-${d}`);
                        }}
                      >
                        Registrar Parto
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      icon={<Info size={16} />}
                      className="w-full justify-center gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetails(reproduction);
                      }}
                    >
                      Ver Detalles
                    </Button>
                    {!canCreate && (
                      <span className="text-xs text-muted font-medium py-1 px-2 text-center w-full">
                        Solo consulta
                      </span>
                    )}
                  </div>
                )}
              </RabbitSelectableCard>
                  );
                })}
            </CageGroupCard>
          ))}
        </div>
      )}

      {groupedGestaciones.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(groupedGestaciones.length / limit))}
          onPageChange={setPage}
        />
      )}

      {/* Modal de Cancelación/Eliminación */}
      <Dialog
        open={!!toCancel}
        onClose={() => {
          setToCancel(null);
          setCancelReason('');
          setCancelReasonOther('');
        }}
        title={(() => {
          const label = toCancel?.femaleName ? `${toCancel.femaleName} - ${toCancel.femaleCode}` : (toCancel?.femaleCode ?? '');
          return `Cancelar Parto: ${label}`;
        })()}
      >
        <div className="p-4">
          <div className="bg-theme-surface border border-strong rounded-xl p-4 mb-4">
            <p className="text-sm text-main">
              Selecciona la razón por la cual estás cancelando este parto.
            </p>
          </div>
          
          <div className="mb-6 space-y-4">
            <Select
              label="Razón de cancelación"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              options={[
                { value: 'no_preniada', label: 'No quedó preñada' },
                { value: 'error', label: 'Error de registro' },
                { value: 'aborto', label: 'Aborto' },
                { value: 'muerte', label: 'Muerte de la madre' },
                { value: 'otro', label: 'Otro' },
              ]}
              placeholder="Seleccione una razón..."
            />

            {cancelReason === 'otro' && (
              <div>
                <label htmlFor="cancelReasonInput" className="block text-sm font-medium text-main mb-1">Especifique el problema</label>
                <input
                  id="cancelReasonInput"
                  type="text"
                  required
                  value={cancelReasonOther}
                  onChange={(e) => setCancelReasonOther(e.target.value)}
                  className="w-full px-3 py-2 border border-default bg-theme-surface dark:bg-slate-900 text-main rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ej. Complicaciones de salud"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setToCancel(null); setCancelReason(''); setCancelReasonOther(''); }}>
              Cerrar
            </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmCancel}
              disabled={!cancelReason || (cancelReason === 'otro' && !cancelReasonOther.trim()) || canceling}
              loading={canceling}
            >
              Confirmar Cancelación
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal de Registro de Parto */}
      <Dialog
        open={!!toRegisterBirth}
        onClose={() => {
          setToRegisterBirth(null);
          setActualBirthDate('');
        }}
        title={(() => {
          const label = toRegisterBirth?.femaleName ? `${toRegisterBirth.femaleName} - ${toRegisterBirth.femaleCode}` : (toRegisterBirth?.femaleCode ?? '');
          return `Registrar Parto: ${label}`;
        })()}
      >
        <form onSubmit={handleRegisterBirth} className="p-4">
          <p className="text-sm text-muted mb-4">
            Ingresa la fecha real del parto. La coneja pasará a la fase de lactancia por un mes aproximado.
          </p>
          
          <div className="mb-6">
            <Input
              label="Fecha de Parto"
              type="date"
              required
              value={actualBirthDate}
              onChange={(e) => setActualBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Max today
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setToRegisterBirth(null); setActualBirthDate(''); }}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!actualBirthDate || registeringBirth}
              loading={registeringBirth}
            >
              Guardar y Pasar a Fase 3
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal de Detalles de Gestación */}
      <Dialog
        open={!!selectedDetails}
        onClose={() => setSelectedDetails(null)}
        title={(() => {
          const label = selectedDetails?.femaleName ? `${selectedDetails.femaleName} - ${selectedDetails.femaleCode}` : (selectedDetails?.femaleCode ?? '');
          return `Detalles de Gestación: ${label}`;
        })()}
        size="md"
      >
        {selectedDetails && (() => {
          const { daysLeft } = getDaysInGestation(selectedDetails.estimatedBirthDate);
          const canGiveBirth = isBirthDateReached(selectedDetails.estimatedBirthDate);
          const nearBirth = daysLeft >= 0 && daysLeft <= 3;

          return (
            <div className="space-y-4">
              {/* Pareja Reproductiva */}
              <div className="p-4 rounded-xl border border-default bg-theme-surface/50">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 text-center sm:text-left">
                  Pareja Reproductiva
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-3 sm:gap-4">
                  {/* Madre */}
                  <div className="flex flex-col items-center text-center w-full sm:w-auto sm:flex-1 sm:max-w-[140px]">
                    <RabbitAvatar imageUrl={selectedDetails.imageUrl} alt={selectedDetails.femaleCode} size="lg" ring />
                    <span className="mt-2 px-2.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full">
                      Madre
                    </span>
                    <h5 className="font-bold text-main text-sm sm:text-base mt-1.5 truncate max-w-full">
                      {selectedDetails.femaleName || selectedDetails.femaleCode}
                    </h5>
                    {selectedDetails.femaleName && (
                      <p className="text-xs sm:text-sm font-semibold text-muted truncate max-w-full">{selectedDetails.femaleCode}</p>
                    )}
                  </div>

                  {/* Corazon conector */}
                  <div className="flex flex-col items-center justify-center shrink-0 py-0.5 sm:py-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 shadow-sm">
                      <Heart size={15} fill="currentColor" />
                    </div>
                  </div>

                  {/* Padre */}
                  <div className="flex flex-col items-center text-center w-full sm:w-auto sm:flex-1 sm:max-w-[140px]">
                    <RabbitAvatar imageUrl={selectedDetails.maleImageUrl} alt={selectedDetails.maleCode ?? ''} size="lg" ring />
                    <span className="mt-2 px-2.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-full">
                      Padre
                    </span>
                    <h5 className="font-bold text-main text-sm sm:text-base mt-1.5 truncate max-w-full">
                      {selectedDetails.maleName || selectedDetails.maleCode || 'Sin macho'}
                    </h5>
                    {selectedDetails.maleName && (
                      <p className="text-xs sm:text-sm font-semibold text-muted truncate max-w-full">{selectedDetails.maleCode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cronograma de Fechas */}
              <div className="p-3.5 rounded-xl border border-default bg-theme-surface/50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-default/50">
                  <span className="text-muted flex items-center gap-1.5 font-medium">
                    <Calendar size={14} className="text-primary-500" />
                    Fecha de Monta
                  </span>
                  <span className="font-bold text-main">{formatDateTime(selectedDetails.mountDate)}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-default/50">
                  <span className="text-muted flex items-center gap-1.5 font-medium">
                    <Calendar size={14} className="text-amber-500" />
                    Parto Estimado
                  </span>
                  <span className={`font-bold ${canGiveBirth ? 'text-amber-600 dark:text-amber-400' : 'text-main'}`}>
                    {formatDateTime(selectedDetails.estimatedBirthDate)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-1">
                  <span className="text-muted font-medium text-xs">Estado del Parto</span>
                  <span className={`font-bold text-xs sm:text-sm ${nearBirth ? 'text-orange-600 dark:text-orange-400' : 'text-main'}`}>
                    {daysLeft === 0 && 'Día estimado cumplido hoy'}
                    {daysLeft > 0 && `Faltan ${daysLeft} día${daysLeft !== 1 ? 's' : ''} para el parto`}
                    {daysLeft < 0 && `Superó fecha estimada por ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-row gap-3 pt-3 border-t border-default/50">
                {canDelete && (
                  <Button
                    type="button"
                    variant="danger"
                    className="flex-1 justify-center py-2.5 text-sm font-semibold"
                    onClick={() => {
                      const rep = selectedDetails;
                      setSelectedDetails(null);
                      setToCancel(rep);
                    }}
                  >
                    Cancelar Parto
                  </Button>
                )}
                {canUpdate && (
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1 justify-center py-2.5 text-sm font-semibold"
                    onClick={() => {
                      setEditingReproduction(selectedDetails);
                      setShowEditModal(true);
                    }}
                  >
                    Editar Monta
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingReproduction(null);
        }}
        title={(() => {
          const label = editingReproduction?.femaleName ? `${editingReproduction.femaleName} - ${editingReproduction.femaleCode}` : (editingReproduction?.femaleCode ?? '');
          return `Editar monta de ${label}`;
        })()}
        size="md"
      >
        {editingReproduction && (
          <ReproductionForm
            editingReproduction={editingReproduction}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingReproduction(null);
              setSelectedDetails(null);
              onSuccess?.();
            }}
            onCancel={() => {
              setShowEditModal(false);
              setEditingReproduction(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
