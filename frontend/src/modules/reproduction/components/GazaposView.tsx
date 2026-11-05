'use client';

import { useReproduction } from '../hooks/useReproduction';
import type { Reproduction } from '../types/reproduction.types';
import { Button, Dialog, Input, Select, RabbitSelectableCard, CageGroupCard, RabbitAvatar } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Info } from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { useMortality } from '@/modules/mortality/hooks/useMortality';
import { WeaningWizard } from './WeaningWizard';
import { ReproductionPairSection, ReproductionPhaseProgressCard } from './ReproductionSharedCards';
import { formatDateString } from '@/shared/utils/dateUtils';
import { matchesSmartSearch } from '@/shared/utils/rabbitUtils';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface GazaposViewProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function GazaposView({ searchTerm, onSearchChange }: Readonly<GazaposViewProps>) {
  const { reproductions, cancelReproduction, finishLactation, registerBirth, fetchReproductions } = useReproduction({ status: 'lactancia', limit: 1000 });
  const { createMortality } = useMortality({ enabled: false });
  const onSuccess = fetchReproductions;
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canCreate = can('reproduction', 'canCreate');
  const canUpdate = can('reproduction', 'canUpdate');
  const canDelete = can('reproduction', 'canDelete');
  const [page, setPage] = useState(1);
  const limit = 12;

  const [filterRace, setFilterRace] = useState<string>('');
  
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [selectedDetails, setSelectedDetails] = useState<Reproduction | null>(null);
  const lastDetailsReproduction = useRef<Reproduction | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterRace]);

  const lactancias = reproductions.filter(r => {
    if (r.status !== 'lactancia') return false;
    if (r.isFemaleDeleted) return false;
    if (filterRace && String(r.femaleRace).toLowerCase() !== filterRace.toLowerCase()) return false;
    return matchesSmartSearch(searchTerm, r.cageNumber, r.femaleCode, r.femaleName);
  });

  const uniqueRaces = Array.from(new Set(reproductions.filter(r => r.status === 'lactancia' && r.femaleRace).map(r => r.femaleRace)));

  type GroupedLactancia = { cageNumber: number; cageType: string; reproductions: typeof lactancias };
  const groupedLactancias = useMemo(() => {
    const map = lactancias.reduce((acc, reproduction) => {
      const cageNumber = reproduction.cageNumber || 0;
      if (!acc[cageNumber]) {
        acc[cageNumber] = { cageNumber, cageType: reproduction.cageType || 'reproducción', reproductions: [] };
      }
      acc[cageNumber].reproductions.push(reproduction);
      return acc;
    }, {} as Record<number, GroupedLactancia>);
    return Object.values(map).sort((a, b) => a.cageNumber - b.cageNumber);
  }, [lactancias]);

  const paginatedGroups = useMemo(() => {
    return groupedLactancias.slice((page - 1) * limit, page * limit);
  }, [groupedLactancias, page, limit]);

  const formatDateTime = formatDateString;

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

  const handleCloseCancelModal = () => {
    setToCancel(null);
    setCancelReason('');
    setCancelReasonDetail('');
    if (lastDetailsReproduction.current) {
      setSelectedDetails(lastDetailsReproduction.current);
    }
  };

  const handleCloseMortalityModal = () => {
    setToRegisterMortality(null);
    setMortalityKits('');
    setMortalityObs('');
    setMortalityCause('');
    setMortalityCauseSearch('');
    if (lastDetailsReproduction.current) {
      setSelectedDetails(lastDetailsReproduction.current);
    }
  };

  const handleCloseKitsModal = () => {
    setToRegisterKits(null);
    setBornKits('');
    if (lastDetailsReproduction.current) {
      setSelectedDetails(lastDetailsReproduction.current);
    }
  };

  const handleConfirmCancel = async () => {
    if (!toCancel) return;
    const finalReason = cancelReason === 'Otra' ? cancelReasonDetail : cancelReason;
    if (!finalReason.trim()) return;
    
    setCanceling(true);
    try {
      await cancelReproduction(toCancel.id, 'fail', finalReason);
      lastDetailsReproduction.current = null;
      setToCancel(null);
      setSelectedDetails(null);
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
      await createMortality({
        rabbitId: toRegisterMortality.femaleId,
        cause: mortalityCause,
        observations: mortalityObs.trim(),
        isKits: true,
        numberOfKits: Number(mortalityKits),
        deathDate: mortalityDate
      });
      
      lastDetailsReproduction.current = null;
      setToRegisterMortality(null);
      setSelectedDetails(null);
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
    { value: 'otra', label: 'Otra' }
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
      const updatedRep = await registerBirth(toRegisterKits.id, { bornKits: Number(bornKits) });
      setToRegisterKits(null);
      setBornKits('');
      showToast('Gazapos guardados exitosamente.', 'success');
      onSuccess?.();
      if (lastDetailsReproduction.current) {
        setSelectedDetails(updatedRep || {
          ...lastDetailsReproduction.current,
          bornKits: Number(bornKits)
        });
        lastDetailsReproduction.current = null;
      } else {
        setSelectedDetails(null);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error al guardar gazapos.', 'error');
    } finally {
      setRegisteringKits(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-sm sm:text-base font-medium text-main">Camadas en lactancia con fecha estimada de destete a los 30 días. Puedes registrar el destete o finalizar el ciclo en cualquier momento.</p>
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

      {lactancias.length === 0 ? (
        <p className="text-sm text-muted bg-theme-surface p-4 rounded-lg border border-default">
          No hay camadas en etapa de lactancia.
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
                  Lactancia
                </span>
              }
            >
                {group.reproductions.map(reproduction => {
                  const isExpanded = expandedId === reproduction.id;
                  const daysInLactation = getDaysInLactation(reproduction.estimatedBirthDate);

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
                <ReproductionPhaseProgressCard
                  phaseTitle="Lactancia"
                  currentDay={daysInLactation}
                  isNearThreshold={daysInLactation >= 27}
                  dateLabel="Destete estimado"
                  formattedDate={estimatedWeaningDate || 'Por calcular'}
                  bannerText={daysInLactation >= 30 ? '¡Listo para destetar!' : null}
                  bannerTone="emerald"
                />

                {isExpanded && (
                  <div
                    className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {(canCreate || canUpdate) && (
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full justify-center"
                        onClick={(e) => { e.stopPropagation(); setToFinish(reproduction); }}
                      >
                        Registrar Destete
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
                    {!canCreate && !canUpdate && (
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

      {groupedLactancias.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(groupedLactancias.length / limit))}
          onPageChange={setPage}
        />
      )}

      {/* Modal: Finalizar Lactancia con Wizard */}
      {toFinish && (
        <WeaningWizard
          open={!!toFinish}
          onClose={() => setToFinish(null)}
          onFinish={handleConfirmFinish}
          reproduction={toFinish}
          finishing={finishing}
          onKitsRegistered={onSuccess}
        />
      )}

      {/* Modal: Cancelar Lactancia */}
      <Dialog
        open={!!toCancel}
        onClose={handleCloseCancelModal}
        title={(() => {
          const label = toCancel?.femaleName ? `${toCancel.femaleName} - ${toCancel.femaleCode}` : (toCancel?.femaleCode ?? '');
          return `Cancelar Lactancia: ${label}`;
        })()}
      >
        <div className="space-y-4">
          <div className="bg-theme-surface border border-strong rounded-xl p-3.5">
            <p className="text-sm text-main leading-relaxed">
              Selecciona la razón por la cual la lactancia ha fallado, como enfermedad grave o pérdida de crías. El registro pasará al Historial como Fallido.
            </p>
          </div>
          
          <div className="space-y-4">
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
                { value: 'Madre mató o abandonó a las crías', label: 'Madre mató o abandonó a las crías' },
                { value: 'Enfermedad grave o Agalactia', label: 'Enfermedad grave o Agalactia' },
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCloseCancelModal}>
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
        onClose={handleCloseMortalityModal}
        title="Registrar Baja de Gazapos"
      >
        <form onSubmit={handleRegisterMortality} className="space-y-4">
          <p className="text-sm text-muted">
            Ingresa los datos para registrar la baja de gazapos en la camada.
          </p>

          <div className="bg-theme-surface border border-strong p-3 rounded-xl">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Madre de la camada
            </p>
            <div className="flex items-center gap-3 bg-card border border-strong rounded-xl p-2.5 shadow-sm">
              <RabbitAvatar imageUrl={toRegisterMortality?.imageUrl} alt={toRegisterMortality?.femaleCode} size="md" />
              <div className="flex flex-col leading-tight justify-center min-w-0 flex-1">
                <span className="text-sm font-bold text-main truncate">
                  {toRegisterMortality?.femaleName || toRegisterMortality?.femaleCode}
                </span>
                {toRegisterMortality?.femaleName && (
                  <span className="text-xs text-muted font-medium mt-0.5 truncate">
                    {toRegisterMortality.femaleCode}
                  </span>
                )}
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
            <label htmlFor="mortalityCauseInput" className="text-sm font-medium text-main">
              Causa <span className="text-muted ml-0.5">*</span>
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
              <div className="absolute top-full left-0 right-0 z-20 bg-card border border-strong rounded-lg shadow-lg mt-1 max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto">
                {filteredMortalityCauseOptions.length === 0 ? (
                  <p className="text-muted text-sm p-3">No hay opciones disponibles</p>
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
                      className="w-full text-left px-3 py-2 hover:bg-theme-surface border border-default text-sm border-b border-slate-50 last:border-0"
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mortalityObsInput" className="text-sm font-medium text-main">
              Observaciones <span className="text-muted ml-0.5">*</span>
            </label>
            <textarea
              id="mortalityObsInput"
              className="w-full px-3 py-2 text-sm rounded-lg border bg-theme-surface dark:bg-slate-900 border-default text-main dark:text-slate-100 placeholder:text-theme-faint focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              rows={3}
              value={mortalityObs}
              onChange={(e) => setMortalityObs(e.target.value)}
              placeholder="Ingresa detalles o causas del suceso."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCloseMortalityModal}>
              Cerrar
            </Button>
            <Button 
              type="submit" 
              variant="danger" 
              disabled={mortalityKits === '' || mortalityKits <= 0 || registeringMortality || !mortalityCause}
              loading={registeringMortality}
            >
              {mortalityKits ? `Confirmar Baja: ${mortalityKits}` : 'Confirmar Baja'}
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
        onClose={handleCloseKitsModal}
        title={toRegisterKits?.bornKits !== null && toRegisterKits?.bornKits !== undefined ? `Editar Gazapos: ${toRegisterKits?.femaleCode}` : `Registrar Gazapos: ${toRegisterKits?.femaleCode}`}
      >
        <form onSubmit={handleRegisterKits} className="space-y-4">
          <p className="text-sm text-muted">
            Ingresa la cantidad de gazapos vivos en la camada.
          </p>
          
          <div>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCloseKitsModal}>
              Cerrar
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

      {/* Modal de Detalles de Lactancia */}
      <Dialog
        open={!!selectedDetails}
        onClose={() => {
          setSelectedDetails(null);
          lastDetailsReproduction.current = null;
        }}
        title={(() => {
          const label = selectedDetails?.femaleName ? `${selectedDetails.femaleName} - ${selectedDetails.femaleCode}` : (selectedDetails?.femaleCode ?? '');
          return `Detalles de Lactancia: ${label}`;
        })()}
        size="md"
      >
        {selectedDetails && (() => {
          const daysInLactation = getDaysInLactation(selectedDetails.estimatedBirthDate);
          const readyToWean = isWeaningReady(selectedDetails.estimatedBirthDate);
          const hasKits = selectedDetails.bornKits !== null && selectedDetails.bornKits !== undefined;

          let estimatedWeaningDate = '';
          if (selectedDetails.estimatedBirthDate) {
            const date = new Date(selectedDetails.estimatedBirthDate + 'T00:00:00-05:00');
            date.setDate(date.getDate() + 30);
            estimatedWeaningDate = formatDateTime(date.toISOString());
          }

          return (
            <div className="space-y-4">
              <ReproductionPairSection reproduction={selectedDetails} />

              {/* Cronograma de Fechas y Estado */}
              <div className="p-3.5 rounded-xl border border-default bg-theme-surface/50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-default/50">
                  <span className="text-muted flex items-center gap-1.5 font-medium">
                    <Calendar size={14} className="text-primary-500" />
                    Fecha de Parto
                  </span>
                  <span className="font-bold text-main">{formatDateTime(selectedDetails.estimatedBirthDate)}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-default/50">
                  <span className="text-muted flex items-center gap-1.5 font-medium">
                    <Calendar size={14} className="text-primary-500" />
                    Destete Estimado
                  </span>
                  <span className="font-bold text-main">
                    {estimatedWeaningDate || 'Por calcular'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-default/50">
                  <span className="text-muted font-medium">Gazapos Vivos</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm sm:text-base ${hasKits ? 'text-main' : 'text-amber-600 dark:text-amber-400'}`}>
                      {hasKits ? selectedDetails.bornKits : 'Sin registrar'}
                    </span>
                    {hasKits && (canCreate || canUpdate) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-primary-600 hover:text-primary-700 font-semibold"
                        onClick={() => {
                          lastDetailsReproduction.current = selectedDetails;
                          setToRegisterKits(selectedDetails);
                          setBornKits(selectedDetails.bornKits ?? '');
                          setSelectedDetails(null);
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center gap-1 pt-1.5">
                  <span className="text-muted font-medium text-xs">Estado de Lactancia</span>
                  <span className={`font-bold text-xs sm:text-sm ${readyToWean ? 'text-emerald-600 dark:text-emerald-400' : 'text-main'}`}>
                    {(() => {
                      if (daysInLactation >= 30) return 'Lista para destetar';
                      const remainingDays = 30 - daysInLactation;
                      const suffix = remainingDays === 1 ? '' : 's';
                      return `En curso • Faltan ${remainingDays} día${suffix}`;
                    })()}
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
                      lastDetailsReproduction.current = selectedDetails;
                      setToCancel(selectedDetails);
                      setSelectedDetails(null);
                    }}
                  >
                    Cancelar Lactancia
                  </Button>
                )}
                {hasKits && (canCreate || canUpdate) && (
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1 justify-center py-2.5 text-sm font-semibold"
                    onClick={() => {
                      lastDetailsReproduction.current = selectedDetails;
                      setToRegisterMortality(selectedDetails);
                      setSelectedDetails(null);
                    }}
                  >
                    Baja de Gazapos
                  </Button>
                )}
                {!hasKits && (canCreate || canUpdate) && (
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1 justify-center py-2.5 text-sm font-semibold"
                    onClick={() => {
                      lastDetailsReproduction.current = selectedDetails;
                      setToRegisterKits(selectedDetails);
                      setBornKits('');
                      setSelectedDetails(null);
                    }}
                  >
                    Registrar Gazapos
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
