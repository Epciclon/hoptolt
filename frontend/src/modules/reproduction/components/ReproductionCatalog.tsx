'use client';

import { useReproduction } from '../hooks/useReproduction';
import { FilterBar } from '@/shared/ui/FilterBar';
import type { Reproduction } from '../types/reproduction.types';
import { Dialog, Select, RabbitSelectableCard, CageGroupCard, Button } from '@/shared/ui';
import { useState } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { ReproductionForm } from './ReproductionForm';
import { useToast } from '@/shared/contexts/ToastContext';
import { Input } from '@/shared/ui/Input';
import { mortalityService } from '@/modules/mortality/services/mortality.service';

interface ReproductionCatalogProps {
  reproductions: Reproduction[];
  onSuccess?: () => void;
}

export function ReproductionCatalog({ reproductions, onSuccess }: Readonly<ReproductionCatalogProps>) {
  const { cancelReproduction, registerBirth } = useReproduction();
  const { showToast } = useToast();
  const [toCancel, setToCancel] = useState<Reproduction | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelReasonOther, setCancelReasonOther] = useState<string>('');
  
  const [toRegisterBirth, setToRegisterBirth] = useState<Reproduction | null>(null);
  const [actualBirthDate, setActualBirthDate] = useState<string>('');
  const [registeringBirth, setRegisteringBirth] = useState(false);

  const [editingReproduction, setEditingReproduction] = useState<Reproduction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRace, setFilterRace] = useState('');

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
        await mortalityService.create({
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
    const days = 31 - daysLeft; // 31 = avg gestation days
    return { days: Math.max(0, days), daysLeft: Math.max(0, daysLeft) };
  };

  const gestaciones = reproductions.filter(r => {
      if (r.status !== 'gestacion') return false;
      if (r.isFemaleDeleted) return false;
      
      const matchesSearch = 
        r.femaleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.femaleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.cageNumber?.toString().includes(searchTerm);
        
      const matchesRace = filterRace ? r.femaleRace === filterRace : true;
      
      return matchesSearch && matchesRace;
  });

  const uniqueRaces = Array.from(new Set(reproductions.filter(r => r.status === 'gestacion' && r.femaleRace).map(r => r.femaleRace)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-base font-medium text-slate-700">En esta fase se encuentran las conejas con fechas estimadas que aún no han realizado su parto, calculado a 1 mes desde la fecha de monta. El sistema estima la fecha, pero tienes la opción de registrar el parto antes si este ocurre de forma anticipada, lo cual moverá automáticamente a la coneja a la fase 3 de lactancia.</p>
      </div>
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
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
        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
          No hay conejas en etapa de gestación que coincidan con los filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {Object.values(gestaciones.reduce((acc, reproduction) => {
            const cageNumber = reproduction.cageNumber || 0;
            if (!acc[cageNumber]) {
              acc[cageNumber] = { cageNumber, cageType: reproduction.cageType || 'reproducción', reproductions: [] };
            }
            acc[cageNumber].reproductions.push(reproduction);
            return acc;
          }, {} as Record<number, { cageNumber: number; cageType: string; reproductions: typeof gestaciones }>)).sort((a,b) => a.cageNumber - b.cageNumber).map(group => (
            <CageGroupCard 
              key={group.cageNumber} 
              cageNumber={group.cageNumber} 
              cageType={group.cageType}
              headerBadge={
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                  Gestación
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                {group.reproductions.map(reproduction => {
                  const isExpanded = expandedId === reproduction.id;
                  const canGiveBirth = isBirthDateReached(reproduction.estimatedBirthDate);
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
                  {reproduction.maleCode && (
                    <div className="bg-slate-50/50 border border-slate-100 p-2 rounded">
                      <p className="text-slate-500 mb-2">Última pareja</p>
                      <div className="flex items-center gap-2">
                        {reproduction.maleImageUrl ? (
                          <img
                            src={reproduction.maleImageUrl}
                            alt={reproduction.maleCode ?? ''}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 text-[8px] text-center leading-tight px-0.5">
                            Sin foto
                          </div>
                        )}
                        <div>
                          {reproduction.maleName ? (
                            <>
                              <h4 className="font-bold text-sm text-slate-800 leading-tight">{reproduction.maleName}</h4>
                              <p className="text-xs text-slate-500">{reproduction.maleCode}</p>
                            </>
                          ) : (
                            <h4 className="font-bold text-sm text-slate-800 leading-tight">{reproduction.maleCode}</h4>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50/50 border border-slate-100 p-2 rounded flex justify-between items-center">
                    <p className="text-slate-500">Fecha de monta</p>
                    <p className="font-medium text-slate-700">{formatDateTime(reproduction.mountDate)}</p>
                  </div>
                  <button 
                    type="button"
                    className={`bg-slate-50/50 border border-slate-100 p-2 rounded flex justify-between items-center w-full text-left ${
                      isExpanded 
                        ? 'cursor-pointer hover:bg-primary-50 hover:border-primary-200 transition-colors group' 
                        : ''
                    }`}
                    onClick={(e) => {
                      if (!isExpanded) return;
                      e.stopPropagation();
                      setEditingReproduction(reproduction);
                      setShowEditModal(true);
                    }}
                  >
                    <p className="text-slate-500 flex items-center gap-1">
                      <Calendar size={12} className="opacity-70" />
                      Fecha estimada
                    </p>
                    <p className={`font-medium ${canGiveBirth ? 'text-amber-600' : 'text-slate-700'}`}>{formatDateTime(reproduction.estimatedBirthDate)}</p>
                  </button>
                  <div className={`p-2 rounded flex justify-between items-center border ${
                    nearBirth
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-slate-50/50 border-slate-100'
                  }`}>
                    <p className={`${nearBirth ? 'text-orange-600' : 'text-slate-500'}`}>Días de gestación</p>
                    <div className="text-right">
                      <p className={`font-bold ${nearBirth ? 'text-orange-600' : 'text-slate-700'}`}>
                        {31 - Math.max(0, daysLeft)} / 31
                      </p>
                      {nearBirth && daysLeft > 0 && (
                        <p className="text-[10px] text-orange-500 font-medium">Parto en {daysLeft} día{daysLeft !== 1 ? 's' : ''}</p>
                      )}
                      {daysLeft === 0 && <p className="text-[10px] text-orange-600 font-semibold">Hoy es el día estimado</p>}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div 
                    className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
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
                    <Button
                      type="button"
                      variant="danger"
                      icon={<Trash2 size={16} />}
                      className="w-full justify-center gap-2"
                      onClick={(e) => { e.stopPropagation(); setToCancel(reproduction); }}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </RabbitSelectableCard>
                  );
                })}
              </div>
            </CageGroupCard>
          ))}
        </div>
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
          const name = toCancel?.femaleName ? ` — ${toCancel.femaleName}` : '';
          return `Cancelar Gestación: ${toCancel?.femaleCode ?? ''}${name}`;
        })()}
      >
        <div className="p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-700">
              Selecciona la razón por la cual estás cancelando esta gestación.
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
                <label htmlFor="cancelReasonInput" className="block text-sm font-medium text-slate-700 mb-1">Especifique el problema</label>
                <input
                  id="cancelReasonInput"
                  type="text"
                  required
                  value={cancelReasonOther}
                  onChange={(e) => setCancelReasonOther(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
          const name = toRegisterBirth?.femaleName ? ` — ${toRegisterBirth.femaleName}` : '';
          return `Registrar Parto: ${toRegisterBirth?.femaleCode ?? ''}${name}`;
        })()}
      >
        <form onSubmit={handleRegisterBirth} className="p-4">
          <p className="text-sm text-slate-600 mb-4">
            Ingresa la fecha real del parto. La coneja pasará a la fase de lactancia (1 mes).
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

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingReproduction(null);
        }}
        title={(() => {
          const name = editingReproduction?.femaleName ? ` — ${editingReproduction.femaleName}` : '';
          return `Editar monta de ${editingReproduction?.femaleCode ?? ''}${name}`;
        })()}
        size="xl"
      >
        {editingReproduction && (
          <ReproductionForm
            editingReproduction={editingReproduction}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingReproduction(null);
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
