import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, ConfirmDialog, RabbitSelectableCard, CageGroupCard } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { useToast } from '@/shared/contexts/ToastContext';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction, MatingRabbit } from '../types/reproduction.types';
import { Heart, Clock, Trash2 } from 'lucide-react';
import { MatingModal } from './MatingModal';

const getRemainingTime = (createdAt?: string) => {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - created) / (1000 * 60 * 60);
  const remaining = 24 - elapsedHours;
  
  if (remaining <= 0) return 'Transición inminente...';
  if (remaining < 1) {
    const minutes = Math.ceil(remaining * 60);
    return `Faltan ${minutes} min`;
  }
  return `Faltan ${Math.ceil(remaining)} horas`;
};

interface MontasViewProps {
  reproductions: Reproduction[];
  onSuccess: () => void;
}

export function MontasView({ reproductions, onSuccess }: Readonly<MontasViewProps>) {
  const { showToast } = useToast();

  const { data: allMales = [], isLoading: loadingMales } = useQuery({
    queryKey: ['availableMalesForMating'],
    queryFn: async () => {
      try {
        return await reproductionService.getAvailableMalesForMating();
      } catch (error) {
        showToast('Error al cargar machos reproductores', 'error');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000
  });

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [selectedMale, setSelectedMale] = useState<MatingRabbit | null>(null);
  const [showMatingModal, setShowMatingModal] = useState(false);
  const [finishingReproduction, setFinishingReproduction] = useState<Reproduction | null>(null);
  const [cancelingReproduction, setCancelingReproduction] = useState<Reproduction | null>(null);
  const [expandedMaleId, setExpandedMaleId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const activeMontas = reproductions.filter(r => r.status === 'monta' && !r.isFemaleDeleted);

  const handleFinishMating = async () => {
    if (!finishingReproduction) return;
    setProcessing(true);
    try {
      await reproductionService.finishMating(finishingReproduction.id);
      showToast('Monta finalizada. La hembra ha regresado a gestación.', 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.message || 'Error al finalizar la monta', 'error');
    } finally {
      setProcessing(false);
      setFinishingReproduction(null);
    }
  };

  const handleCancelMating = async () => {
    if (!cancelingReproduction) return;
    setProcessing(true);
    try {
      await reproductionService.cancelReproduction(cancelingReproduction.id, 'delete');
      showToast('Monta cancelada y eliminada exitosamente.', 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.message || 'Error al cancelar la monta', 'error');
    } finally {
      setProcessing(false);
      setCancelingReproduction(null);
    }
  };

  // Combinar los machos con sus estados de monta actuales
  const malesWithStatus = allMales.map(male => {
    const activeMonta = activeMontas.find(r => r.maleId === male.id);
    return {
      ...male,
      isOccupied: !!activeMonta,
      activeMonta
    };
  });

  const filteredMales = malesWithStatus.filter(male => {
    const safeCode = male.code ? male.code.toLowerCase() : '';
    const safeName = male.name ? male.name.toLowerCase() : '';
    const safeCage = male.cageNumber ? male.cageNumber.toString() : '';
    const safeSearch = search ? search.toLowerCase() : '';

    const matchesSearch = 
      safeCode.includes(safeSearch) || 
      safeName.includes(safeSearch) ||
      safeCage.includes(safeSearch);
      
    let matchesStatus = true;
    if (statusFilter === 'disponible') matchesStatus = !male.isOccupied;
    if (statusFilter === 'en_monta') matchesStatus = male.isOccupied;

    return matchesSearch && matchesStatus;
  });

  let content;
  if (loadingMales) {
    content = (
      <div className="py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  } else if (filteredMales.length === 0) {
    content = (
      <p className="text-sm text-center text-slate-500 py-8">
        No se encontraron machos reproductores que coincidan con la búsqueda.
      </p>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {Object.values(filteredMales.reduce((acc, macho) => {
          const cageNumber = macho.cageNumber || 0;
          if (!acc[cageNumber]) {
            acc[cageNumber] = { cageNumber, cageType: macho.cageType || 'reproducción', machos: [] };
          }
          acc[cageNumber].machos.push(macho);
          return acc;
        }, {} as Record<number, { cageNumber: number; cageType: string; machos: typeof filteredMales }>)).sort((a,b) => a.cageNumber - b.cageNumber).map(group => (
          <CageGroupCard 
            key={group.cageNumber} 
            cageNumber={group.cageNumber} 
            cageType={group.cageType}
            headerBadge={
              group.machos[0]?.isOccupied ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 text-[10px] font-medium rounded-full animate-pulse">
                  <Heart size={10} /> En Monta
                </span>
              ) : (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                  Disponible
                </span>
              )
            }
          >
            <div className="flex flex-col gap-3">
              {group.machos.map(macho => (
          <RabbitSelectableCard
            key={macho.id}
            rabbit={{
              id: macho.id,
              code: macho.code,
              name: macho.name,
              race: macho.race,
              imageUrl: macho.imageUrl,
              cageNumber: macho.cageNumber,
              age: macho.age,
              weight: macho.weight
            }}
            isSelected={expandedMaleId === macho.id}
            onClick={() => setExpandedMaleId(expandedMaleId === macho.id ? null : macho.id)}
          >

            {macho.isOccupied && macho.activeMonta ? (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-slate-500 text-xs font-medium mb-2">Pareja actual</p>
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {macho.activeMonta.imageUrl ? (
                      <img src={macho.activeMonta.imageUrl} alt={macho.activeMonta.femaleCode} className="w-10 h-10 flex-shrink-0 rounded-full object-cover shadow-sm border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 text-[9px] text-center leading-tight px-1">
                        Sin foto
                      </div>
                    )}
                    <div>
                      {macho.activeMonta.femaleName ? (
                        <>
                          <h4 className="font-bold text-sm text-slate-800 leading-tight">{macho.activeMonta.femaleName}</h4>
                          <p className="text-xs text-slate-500">{macho.activeMonta.femaleCode}</p>
                        </>
                      ) : (
                        <h4 className="font-bold text-sm text-slate-800 leading-tight">{macho.activeMonta.femaleCode}</h4>
                      )}
                    </div>
                  </div>
                  {macho.activeMonta.femaleRace && (
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-full shrink-0 ml-1 capitalize border border-slate-200">
                      {macho.activeMonta.femaleRace}
                    </span>
                  )}
                </div>
                
                {(macho.activeMonta.femaleAge !== undefined || macho.activeMonta.femaleWeight !== undefined) && (
                  <div className="flex justify-between text-xs text-slate-600 px-1 mt-1">
                    <span>{macho.activeMonta.femaleAge !== undefined ? <><span className="font-medium text-slate-700">{macho.activeMonta.femaleAge}</span> meses</> : null}</span>
                    <span>{macho.activeMonta.femaleWeight !== undefined ? <><span className="font-medium text-slate-700">{macho.activeMonta.femaleWeight}</span> kg</> : null}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 px-1 text-xs font-medium text-slate-600 bg-slate-50 py-1.5 rounded-md justify-center border border-slate-200">
                  <Clock size={12} className="opacity-70" />
                  {getRemainingTime(macho.activeMonta.createdAt)}
                </div>
              </div>
            ) : null}

            {expandedMaleId === macho.id && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                {macho.isOccupied ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <Button 
                      variant="primary" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFinishingReproduction(macho.activeMonta!);
                      }}
                    >
                      Finalizar Monta
                    </Button>
                    <Button 
                      variant="danger" 
                      className="w-full justify-center gap-2"
                      icon={<Trash2 size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelingReproduction(macho.activeMonta!);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMale(macho);
                      setShowMatingModal(true);
                    }}
                  >
                    Elegir Pareja
                  </Button>
                )}
              </div>
            )}
          </RabbitSelectableCard>
              ))}
            </div>
          </CageGroupCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-base font-medium text-slate-700">En esta fase se encuentran los machos iguales o mayores de 4 meses.</p>
      </div>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por código, nombre o N° de jaula..."
        filters={[
          {
            key: 'status',
            placeholder: 'Filtrar por estado',
            options: [
              { label: 'Disponibles', value: 'disponible' },
              { label: 'En Monta (Ocupados)', value: 'en_monta' }
            ],
            value: statusFilter,
            onChange: setStatusFilter
          }
        ]}
      />

      {content}

      <ConfirmDialog
        open={!!finishingReproduction}
        onClose={() => setFinishingReproduction(null)}
        onConfirm={handleFinishMating}
        loading={processing}
        title="Finalizar Monta"
        description={
          finishingReproduction ? (
            <>
              ¿Estás seguro de que deseas retirar a la hembra <b>{finishingReproduction.femaleName ? `${finishingReproduction.femaleName} — ${finishingReproduction.femaleCode}` : finishingReproduction.femaleCode}</b> de la jaula del macho? Esto registrará que la monta ha concluido y pasará al estado de Gestación.
            </>
          ) : ''
        }
        confirmLabel="Sí, finalizar monta"
        variant="primary"
      />

      {showMatingModal && selectedMale && (
        <MatingModal 
          male={selectedMale}
          onClose={() => {
            setShowMatingModal(false);
            setSelectedMale(null);
          }}
          onSuccess={() => {
            setShowMatingModal(false);
            setSelectedMale(null);
            onSuccess();
          }}
        />
      )}

      {cancelingReproduction && (
        <ConfirmDialog
          open={!!cancelingReproduction}
          onClose={() => setCancelingReproduction(null)}
          onConfirm={handleCancelMating}
          title="Cancelar Monta"
          description={<>¿Estás seguro de que deseas eliminar esta monta? La coneja quedará libre nuevamente.</>}
          confirmLabel="Sí, eliminar"
          variant="danger"
          loading={processing}
        />
      )}
    </div>
  );
}
