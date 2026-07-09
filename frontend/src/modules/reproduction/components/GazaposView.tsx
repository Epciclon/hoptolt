'use client';

import { cn } from '@/lib/utils';
import { useReproduction } from '../hooks/useReproduction';
import type { Reproduction } from '../types/reproduction.types';
import { Button, Dialog, Input, Select, RabbitSelectableCard, CageGroupCard } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { mortalityService } from '@/modules/mortality/services/mortality.service';
import { WeaningWizard } from './WeaningWizard';
import { ReproductionForm } from './ReproductionForm';

interface GazaposViewProps {
  reproductions: Reproduction[];
  onSuccess?: () => void;
}

export function GazaposView({ reproductions, onSuccess }: Readonly<GazaposViewProps>) {
  const { cancelReproduction, finishLactation, registerBirth } = useReproduction();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRace, setFilterRace] = useState<string>('');
  
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [editingReproduction, setEditingReproduction] = useState<Reproduction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Modals state
  const [toCancel, setToCancel] = useState<Reproduction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonDetail, setCancelReasonDetail] = useState('');
  const [canceling, setCanceling] = useState(false);

  const [toFinish, setToFinish] = useState<Reproduction | null>(null);
  const [finishing, setFinishing] = useState(false);

  const [toRegisterMortality, setToRegisterMortality] = useState<Reproduction | null>(null);
  const [mortalityKits, setMortalityKits] = useState<number | ''>('');
  
  const [mortalityDate, setMortalityDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  });
  
  const [mortalityCause, setMortalityCause] = useState('');
  const [mortalityPrevCause, setMortalityPrevCause] = useState('');
  const [mortalityCauseSearch, setMortalityCauseSearch] = useState('');
  const [showMortalityCauseDropdown, setShowMortalityCauseDropdown] = useState(false);
  const [mortalityCustomCause, setMortalityCustomCause] = useState('');
  const [mortalityCustomCauseInput, setMortalityCustomCauseInput] = useState('');
  const [isMortalityCustomCauseModalOpen, setIsMortalityCustomCauseModalOpen] = useState(false);
  
  const mortalityCauseDropdownRef = useRef<HTMLDivElement>(null);
  const [mortalityObs, setMortalityObs] = useState('');
  const [registeringMortality, setRegisteringMortality] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mortalityCauseDropdownRef.current && !mortalityCauseDropdownRef.current.contains(target)) {
        setShowMortalityCauseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [toRegisterKits, setToRegisterKits] = useState<Reproduction | null>(null);
  const [bornKits, setBornKits] = useState<number | ''>('');
  const [registeringKits, setRegisteringKits] = useState(false);

  const lactancias = reproductions.filter(r => {
    if (r.status !== 'lactancia') return false;
    const matchesSearch = 
      r.femaleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.femaleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cageNumber?.toString().includes(searchTerm);
      
    const matchesRace = filterRace ? String(r.femaleRace).toLowerCase() === filterRace.toLowerCase() : true;

    return r.status === 'lactancia' && matchesSearch && matchesRace;
  });

  const uniqueRaces = Array.from(new Set(reproductions.filter(r => r.status === 'lactancia' && r.femaleRace).map(r => r.femaleRace)));

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      return ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const getDaysInLactation = (birthDateString: string | null | undefined) => {
    if (!birthDateString) return 0;
    const parts = birthDateString.split('-');
    if (parts.length !== 3) return 0;
    
    const birthDate = new Date(Number.parseInt(parts[0]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[2]));
    const ecuadorDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    
    ecuadorDate.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);
    
    const diffTime = ecuadorDate.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    return Math.max(0, diffDays);
  };

  const isWeaningReady = (birthDateString: string | null | undefined) => {
    return getDaysInLactation(birthDateString) >= 30;
  };

  const handleConfirmCancel = async () => {
    if (!toCancel) return;
    const finalReason = cancelReason === 'Otra' ? cancelReasonDetail : cancelReason;
    if (!finalReason.trim()) return;
    
    setCanceling(true);
    try {
      await cancelReproduction(toCancel.id, 'fail', finalReason);
      setToCancel(null);
      setCancelReason('');
      setCancelReasonDetail('');
      showToast('Lactancia cancelada y registrada como fallida.', 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al cancelar la lactancia.', 'error');
    } finally {
      setCanceling(false);
    }
  };

  const handleConfirmFinish = async () => {
    if (!toFinish?.id) return;
    setFinishing(true);
    try {
      await finishLactation(toFinish.id);
      showToast('Lactancia completada exitosamente. Se ha guardado en el historial.', 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al finalizar la lactancia.', 'error');
    } finally {
      setFinishing(false);
      setToFinish(null);
    }
  };

  const handleRegisterMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toRegisterMortality || mortalityKits === '' || mortalityKits <= 0) return;
    
    if (!mortalityCause || !mortalityCauseSearch.trim()) {
      showToast('Por favor, selecciona una causa de baja de la lista.', 'error');
      return;
    }
    
    if (!mortalityObs.trim()) {
      showToast('Las observaciones son obligatorias.', 'error');
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const selectedDateObj = new Date(mortalityDate + 'T00:00:00');
    if (selectedDateObj > today) {
      showToast('La fecha de muerte no puede ser futura.', 'error');
      return;
    }
    
    setRegisteringMortality(true);
    try {
      await mortalityService.create({
        rabbitId: toRegisterMortality.femaleId,
        cause: mortalityCause,
        observations: mortalityObs.trim(),
        isKits: true,
        numberOfKits: Number(mortalityKits),
        deathDate: mortalityDate
      });
      
      setToRegisterMortality(null);
      setMortalityKits('');
      setMortalityCause('');
      setMortalityCauseSearch('');
      setMortalityObs('');
      showToast('Mortalidad de gazapos registrada.', 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al registrar mortalidad.', 'error');
    } finally {
      setRegisteringMortality(false);
    }
  };

  const baseMortalityCauseOptions = [
    { value: 'enfermedad', label: 'Enfermedad' },
    { value: 'aplastamiento', label: 'Aplastamiento por la madre' },
    { value: 'clima', label: 'Condiciones climáticas' },
    { value: 'otra', label: 'Otra (especificar causa)' }
  ];

  const mortalityCauseOptions = [...baseMortalityCauseOptions];
  if (mortalityCustomCause && !baseMortalityCauseOptions.some(opt => opt.value === mortalityCustomCause)) {
    mortalityCauseOptions.splice(-1, 0, {
      value: mortalityCustomCause,
      label: mortalityCustomCause
    });
  }

  const filteredMortalityCauseOptions = mortalityCauseOptions.filter(opt =>
    opt.label.toLowerCase().includes(mortalityCauseSearch.toLowerCase())
  );
  
  const handleConfirmMortalityCustomCause = () => {
    const trimmed = mortalityCustomCauseInput.trim();
    if (trimmed) {
      setMortalityCustomCause(trimmed);
      setMortalityCause(trimmed);
      setMortalityCauseSearch(trimmed);
      setIsMortalityCustomCauseModalOpen(false);
    }
  };

  const handleCancelMortalityCustomCause = () => {
    setMortalityCause(mortalityPrevCause);
    const matched = mortalityCauseOptions.find(opt => opt.value === mortalityPrevCause);
    setMortalityCauseSearch(matched?.label ?? '');
    setIsMortalityCustomCauseModalOpen(false);
  };

  const handleRegisterKits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toRegisterKits || bornKits === '' || bornKits < 0) return;
    
    setRegisteringKits(true);
    try {
      await registerBirth(toRegisterKits.id, { bornKits: Number(bornKits) });
      setToRegisterKits(null);
      setBornKits('');
      showToast('Gazapos registrados exitosamente.', 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al registrar gazapos.', 'error');
    } finally {
      setRegisteringKits(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-base font-medium text-slate-700">En esta fase se encuentran las camadas en lactancia. Las madres estarán en esta etapa aproximadamente 1 mes hasta el destete, calculado desde la fecha de parto. El sistema estima la fecha, pero tienes la opción de finalizar el ciclo de lactancia antes si separas a los gazapos de forma anticipada.</p>
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

      {lactancias.length === 0 ? (
        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
          No hay camadas en etapa de lactancia.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {Object.values(lactancias.reduce((acc, reproduction) => {
            const cageNumber = reproduction.cageNumber || 0;
            if (!acc[cageNumber]) {
              acc[cageNumber] = { cageNumber, cageType: reproduction.cageType || 'reproducción', reproductions: [] };
            }
            acc[cageNumber].reproductions.push(reproduction);
            return acc;
          }, {} as Record<number, { cageNumber: number; cageType: string; reproductions: typeof lactancias }>)).sort((a,b) => a.cageNumber - b.cageNumber).map(group => (
            <CageGroupCard 
              key={group.cageNumber} 
              cageNumber={group.cageNumber} 
              cageType={group.cageType}
              headerBadge={
                <span className="px-2 py-1 bg-sky-100 text-sky-700 text-[10px] font-medium rounded-full">
                  Lactancia
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                {group.reproductions.map(reproduction => {
                  const isExpanded = expandedId === reproduction.id;
                  const daysInLactation = getDaysInLactation(reproduction.estimatedBirthDate);
                  const readyToWean = isWeaningReady(reproduction.estimatedBirthDate);
                  const hasKits = reproduction.bornKits !== null && reproduction.bornKits !== undefined;

                  let estimatedWeaningDate = '';
                  if (reproduction.estimatedBirthDate) {
                    const date = new Date(reproduction.estimatedBirthDate + 'T00:00:00-05:00');
                    date.setDate(date.getDate() + 30);
                    estimatedWeaningDate = formatDateTime(date.toISOString());
                  }

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
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <button
                    type="button"
                    className={cn(
                      'border p-2 rounded relative transition-colors text-left',
                      (() => {
                        if (!isExpanded) return 'bg-white/60 border-slate-100';
                        return hasKits
                          ? 'bg-white/60 border-slate-100 cursor-pointer hover:bg-emerald-50 group'
                          : 'bg-white/60 border-slate-100 cursor-pointer hover:bg-slate-50 group';
                      })()
                    )}
                    onClick={(e) => { 
                      if (!isExpanded) return;
                      e.stopPropagation();
                      if (hasKits) {
                        setToRegisterMortality(reproduction);
                      } else {
                        setToRegisterKits(reproduction);
                        setBornKits('');
                      }
                    }}
                    title={(() => {
                      if (!isExpanded) return '';
                      return hasKits ? 'Clic para registrar una baja de gazapos' : 'Toca para registrar la cantidad de gazapos nacidos';
                    })()}
                  >
                    <p className="text-slate-500 mb-1 flex justify-between items-center">
                      Gazapos Nacidos
                      {(!hasKits && isExpanded) && <Pencil size={12} className="text-slate-400 group-hover:text-primary-500 transition-colors" />}
                      {(hasKits && isExpanded) && <AlertTriangle size={12} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />}
                    </p>
                    <p className={`font-bold text-sm ${hasKits ? 'text-slate-700' : 'text-slate-400 font-normal italic'}`}>
                      {hasKits ? reproduction.bornKits : 'Toca para registrar'}
                    </p>
                  </button>
                  <div className="border p-2 rounded bg-white/60 border-slate-100">
                    <p className="text-slate-500 mb-1">Días en Lactancia</p>
                    <p className="font-bold text-sm text-slate-700">{daysInLactation} / 30</p>
                    {daysInLactation >= 27 && daysInLactation < 30 && (
                      <p className="text-[10px] text-amber-600 mt-1 font-medium">Próximo al destete</p>
                    )}
                    {daysInLactation >= 30 && (
                      <p className="text-xs text-slate-800 font-bold mt-1">Listo para destetar</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-2 text-xs">
                  {isExpanded && !hasKits ? (
                    <button
                      type="button"
                      className="bg-slate-50/50 border border-slate-100 p-2 rounded flex justify-between items-center w-full text-left cursor-pointer hover:bg-primary-50 hover:border-primary-200 transition-colors group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingReproduction(reproduction);
                        setShowEditModal(true);
                      }}
                      title="Editar fecha"
                    >
                      <p className="text-slate-500 mb-1 flex items-center gap-1">
                        Fecha de Parto
                      </p>
                      <p className="font-medium text-slate-700">{formatDateTime(reproduction.estimatedBirthDate)}</p>
                    </button>
                  ) : (
                    <div className="bg-slate-50/50 border border-slate-100 p-2 rounded flex justify-between items-center">
                      <p className="text-slate-500">Fecha de Parto</p>
                      <p className="font-medium text-slate-700">{formatDateTime(reproduction.estimatedBirthDate)}</p>
                    </div>
                  )}

                  <div className="bg-slate-50/50 border border-slate-100 p-2 rounded flex justify-between items-center">
                    <p className="text-slate-500">Fecha est. de destete</p>
                    <p className={`font-medium ${readyToWean ? 'text-amber-600' : 'text-slate-700'}`}>{estimatedWeaningDate}</p>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full justify-center gap-2"
                      onClick={(e) => { e.stopPropagation(); setToFinish(reproduction); }}
                    >
                      Finalizar Ciclo
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="w-full justify-center gap-2"
                      onClick={(e) => { e.stopPropagation(); setToCancel(reproduction); }}
                    >
                      <Trash2 size={16} />
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

      {/* Modal: Finalizar Lactancia con Wizard */}
      {toFinish && (
        <WeaningWizard
          open={!!toFinish}
          onClose={() => setToFinish(null)}
          onFinish={handleConfirmFinish}
          reproduction={toFinish}
          finishing={finishing}
        />
      )}

      {/* Modal: Cancelar Lactancia */}
      <Dialog
        open={!!toCancel}
        onClose={() => {
          setToCancel(null);
          setCancelReason('');
          setCancelReasonDetail('');
        }}
        title={(() => {
          const name = toCancel?.femaleName ? ` - ${toCancel.femaleName}` : '';
          return `Cancelar Lactancia: ${toCancel?.femaleCode ?? ''}${name}`;
        })()}
      >
        <div className="p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-700">
              Selecciona la razón por la cual la lactancia ha fallado (ej. la madre mató a las crías, enfermedad grave). El registro pasará al Historial como Fallido.
            </p>
          </div>
          
          <div className="mb-6 flex flex-col gap-4">
            <Select
              label="Razón de fallo"
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (e.target.value !== 'Otra') {
                  setCancelReasonDetail('');
                }
              }}
              options={[
                { value: '', label: 'Seleccionar razón...' },
                { value: 'Mortalidad total de la camada', label: 'Mortalidad total de la camada' },
                { value: 'Madre mató/abandonó a las crías', label: 'Madre mató/abandonó a las crías' },
                { value: 'Enfermedad grave/Agalactia', label: 'Enfermedad grave/Agalactia' },
                { value: 'Muerte de la madre', label: 'Muerte de la madre' },
                { value: 'Otra', label: 'Otra' }
              ]}
              required
            />
            
            {cancelReason === 'Otra' && (
              <Input
                label="Especificar razón"
                type="text"
                required
                value={cancelReasonDetail}
                onChange={(e) => setCancelReasonDetail(e.target.value)}
                placeholder="Ingresa la razón específica..."
                autoFocus
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setToCancel(null); setCancelReason(''); setCancelReasonDetail(''); }}>
              Cerrar
            </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmCancel}
              disabled={!cancelReason || (cancelReason === 'Otra' && !cancelReasonDetail.trim()) || canceling}
              loading={canceling}
            >
              Confirmar Cancelación
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Registrar Baja (Mortalidad) */}
      <Dialog
        open={!!toRegisterMortality}
        onClose={() => {
          setToRegisterMortality(null);
          setMortalityKits('');
          setMortalityObs('');
          setMortalityCause('');
          setMortalityCauseSearch('');
        }}
        title="Registrar Baja"
      >
        <form onSubmit={handleRegisterMortality} className="p-4 space-y-4">
          <p className="text-sm text-slate-600">
            Ingresa los datos para registrar la baja en la camada.
          </p>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Madre de la camada:
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pr-3 pl-1 py-1 shadow-sm">
                {toRegisterMortality?.imageUrl ? (
                  <img src={toRegisterMortality.imageUrl} alt={toRegisterMortality.femaleCode} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-center">
                    <span className="text-[7px] leading-[8px] font-bold text-slate-400 px-0.5">Sin foto</span>
                  </div>
                )}
                <div className="flex flex-col leading-tight justify-center">
                  {toRegisterMortality?.femaleName && (
                    <span className="text-xs font-bold text-slate-700">{toRegisterMortality.femaleName}</span>
                  )}
                  <span className={toRegisterMortality?.femaleName ? 'text-[10px] text-slate-500 font-medium' : 'text-xs font-bold text-slate-700'}>
                    {toRegisterMortality?.femaleCode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <Input
              label="Gazapos Muertos"
              type="number"
              min="1"
              required
              value={mortalityKits}
              onChange={(e) => setMortalityKits(e.target.value ? Number(e.target.value) : '')}
            />

            <Input
              label="Fecha de Muerte"
              type="date"
              value={mortalityDate}
              onChange={(e) => setMortalityDate(e.target.value)}
              required
            />
          </div>

          <div className="relative flex flex-col gap-1.5" ref={mortalityCauseDropdownRef}>
            <label htmlFor="mortalityCauseInput" className="text-sm font-medium text-slate-700">
              Causa <span className="text-red-500">*</span>
            </label>
            <Input
              id="mortalityCauseInput"
              placeholder="Escribe para buscar o selecciona..."
              value={mortalityCauseSearch}
              onChange={(e) => {
                setMortalityCauseSearch(e.target.value);
                setShowMortalityCauseDropdown(true);
              }}
              onFocus={() => setShowMortalityCauseDropdown(true)}
              required
            />
            {showMortalityCauseDropdown && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredMortalityCauseOptions.length === 0 ? (
                  <p className="text-slate-500 text-sm p-3">No hay opciones disponibles</p>
                ) : (
                  filteredMortalityCauseOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (opt.value === 'otra') {
                          setMortalityPrevCause(mortalityCause);
                          setMortalityCustomCauseInput('');
                          setIsMortalityCustomCauseModalOpen(true);
                        } else {
                          setMortalityCause(opt.value);
                          setMortalityCauseSearch(opt.label);
                        }
                        setShowMortalityCauseDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm border-b border-slate-50 last:border-0"
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mortalityObsInput" className="text-sm font-medium text-slate-700">
              Observaciones (¿Qué pasó?) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="mortalityObsInput"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              rows={3}
              value={mortalityObs}
              onChange={(e) => setMortalityObs(e.target.value)}
              placeholder="Ingresa qué pasó. Ej: Aplastamiento accidental, hipotermia, etc."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { 
              setToRegisterMortality(null); 
              setMortalityKits(''); 
              setMortalityObs(''); 
              setMortalityCause('');
              setMortalityCauseSearch('');
            }}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="danger" 
              disabled={mortalityKits === '' || mortalityKits <= 0 || registeringMortality || !mortalityCause}
              loading={registeringMortality}
            >
              {mortalityKits ? `Confirmar Baja (${mortalityKits})` : 'Confirmar Baja'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Mini-modal: Especificar Causa de Muerte */}
      <Dialog
        open={isMortalityCustomCauseModalOpen}
        onClose={handleCancelMortalityCustomCause}
        title="Especificar Causa de Muerte"
        description="Ingresa la causa de muerte específica"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Causa específica"
            placeholder="Ej: barriga hinchada, gripe, etc."
            value={mortalityCustomCauseInput}
            onChange={(e) => setMortalityCustomCauseInput(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelMortalityCustomCause}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmMortalityCustomCause}
              disabled={!mortalityCustomCauseInput.trim()}
            >
              Aceptar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Registrar o Editar Gazapos Nacidos */}
      <Dialog
        open={!!toRegisterKits}
        onClose={() => {
          setToRegisterKits(null);
          setBornKits('');
        }}
        title={`Registrar Gazapos: ${toRegisterKits?.femaleCode}`}
      >
        <form onSubmit={handleRegisterKits} className="p-4">
          <p className="text-sm text-slate-600 mb-2">
            Ingresa la cantidad inicial de gazapos nacidos vivos en la camada.
          </p>
          <div className="bg-slate-50 text-slate-600 text-xs p-3 rounded-lg border border-slate-200 mb-4 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              <strong>Atención:</strong> Una vez guardada esta cantidad, quedará <strong>bloqueada y no se podrá volver a editar</strong>. Asegúrate de ingresar el número correcto inicial antes de que ocurran posibles bajas.
            </p>
          </div>
          
          <div className="mb-6">
            <Input
              label="Cantidad de Gazapos"
              type="number"
              min="0"
              required
              value={bornKits}
              onChange={(e) => setBornKits(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ej. 6"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setToRegisterKits(null); setBornKits(''); }}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={bornKits === '' || bornKits < 0 || registeringKits}
              loading={registeringKits}
            >
              Guardar Gazapos
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
          return `Editar fechas de ${editingReproduction?.femaleCode ?? ''}${name}`;
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
