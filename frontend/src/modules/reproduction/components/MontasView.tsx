import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, CageGroupCard, RabbitSelectableCard, RabbitAvatar, ConfirmDialog } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { useToast } from '@/shared/contexts/ToastContext';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction, MatingRabbit } from '../types/reproduction.types';
import { useReproduction } from '../hooks/useReproduction';
import { Pagination } from '@/shared/ui/Pagination';
import { Heart, Clock, X } from 'lucide-react';
import { MatingModal } from './MatingModal';
import { matchesSmartSearch } from '@/shared/utils/rabbitUtils';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

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
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function MontasView({ searchTerm, onSearchChange }: Readonly<MontasViewProps>) {
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canCreate = can('reproduction', 'canCreate');
  const canUpdate = can('reproduction', 'canUpdate');
  const canDelete = can('reproduction', 'canDelete');

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

  const { reproductions, fetchReproductions } = useReproduction({ status: 'monta', limit: 1000 });
  const onSuccess = fetchReproductions;

  // Filtros
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const filteredMales = malesWithStatus.filter((male) => {
    let matchesStatus = true;
    if (statusFilter === 'disponible') matchesStatus = !male.isOccupied;
    if (statusFilter === 'en_monta') matchesStatus = male.isOccupied;
    if (!matchesStatus) return false;

    return matchesSmartSearch(searchTerm, male.cageNumber, male.code, male.name);
  });

  type GroupedMale = { cageNumber: number; cageType: string; machos: typeof filteredMales };
  const groupedMales = (Object.values(filteredMales.reduce((acc: Record<number, GroupedMale>, macho) => {
    const cageNumber = macho.cageNumber || 0;
    if (!acc[cageNumber]) {
      acc[cageNumber] = { cageNumber, cageType: macho.cageType || 'reproducción', machos: [] };
    }
    acc[cageNumber].machos.push(macho);
    return acc;
  }, {} as Record<number, GroupedMale>)) as GroupedMale[]).sort((a,b) => a.cageNumber - b.cageNumber);

  const paginatedGroups = groupedMales.slice((page - 1) * limit, page * limit);

  let content;
  if (loadingMales) {
    content = (
      <div className="py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  } else if (filteredMales.length === 0) {
    content = (
      <p className="text-sm text-center text-muted py-8">
        No se encontraron machos reproductores que coincidan con la búsqueda.
      </p>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {paginatedGroups.map(group => (
          <CageGroupCard 
            key={group.cageNumber} 
            cageNumber={group.cageNumber} 
            cageType={group.cageType}
            headerBadge={
              group.machos[0]?.isOccupied ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium rounded-full animate-pulse whitespace-nowrap">
                  <Heart size={11} /> En Monta
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full whitespace-nowrap">
                  Disponible
                </span>
              )
            }
          >
              {group.machos.map((macho) => (
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
              <div className="mt-3 pt-3 border-t border-strong">
                <p className="text-muted text-xs font-medium mb-2">Pareja actual</p>
                
                <div className="flex flex-col items-center gap-2 mb-2 min-w-0">
                  <div className="shrink-0 mb-1">
                    <RabbitAvatar imageUrl={macho.activeMonta.imageUrl} alt={macho.activeMonta.femaleCode} size="md" />
                  </div>
                  <div className="min-w-0 flex-1 w-full">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {macho.activeMonta.femaleName ? (
                          <>
                            <h4 className="font-bold text-sm text-main leading-tight truncate" title={macho.activeMonta.femaleName}>
                              {macho.activeMonta.femaleName}
                            </h4>
                            <p className="text-xs text-muted leading-tight mt-0.5 truncate font-medium">
                              {macho.activeMonta.femaleCode}
                            </p>
                          </>
                        ) : (
                          <h4 className="font-bold text-sm text-main leading-tight truncate" title={macho.activeMonta.femaleCode}>
                            {macho.activeMonta.femaleCode}
                          </h4>
                        )}
                      </div>
                      {macho.activeMonta.femaleRace && (
                        <span className="px-2 py-0.5 bg-theme-surface text-muted text-xs font-medium rounded-full capitalize border border-strong shrink-0 whitespace-nowrap" title={macho.activeMonta.femaleRace}>
                          {macho.activeMonta.femaleRace}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {(macho.activeMonta.femaleAge !== undefined || macho.activeMonta.femaleWeight !== undefined) && (
                  <div className="flex justify-between text-xs text-muted px-1 mt-1">
                    <span>{macho.activeMonta.femaleAge !== undefined ? <><span className="font-medium text-main">{macho.activeMonta.femaleAge}</span> meses</> : null}</span>
                    <span>{macho.activeMonta.femaleWeight !== undefined ? <><span className="font-medium text-main">{macho.activeMonta.femaleWeight}</span> kg</> : null}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 px-1 text-xs font-medium text-muted bg-theme-surface py-1.5 rounded-md justify-center border border-strong">
                  <Clock size={12} className="opacity-70" />
                  {getRemainingTime(macho.activeMonta.createdAt)}
                </div>
              </div>
            ) : null}

            {expandedMaleId === macho.id && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                {macho.isOccupied ? (
                  (canCreate || canUpdate || canDelete) ? (
                    <div className="mt-4 flex flex-col gap-2">
                      {(canCreate || canUpdate) && (
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
                      )}
                      {canDelete && (
                        <Button 
                          variant="danger" 
                          className="w-full justify-center gap-2"
                          icon={<X size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelingReproduction(macho.activeMonta!);
                          }}
                        >
                          Cancelar Monta
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center w-full py-2 text-xs text-muted font-medium">
                      Solo consulta
                    </div>
                  )
                ) : (
                  canCreate ? (
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
                  ) : (
                    <div className="text-center w-full py-2 text-xs text-muted font-medium">
                      Solo consulta
                    </div>
                  )
                )}
              </div>
            )}
          </RabbitSelectableCard>
              ))}
          </CageGroupCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1 items-start">
        <p className="text-base font-medium text-main">En esta fase se encuentran los machos iguales o mayores de 4 meses.</p>
      </div>
      <FilterBar
        searchPlaceholder="Buscar macho por código o jaula..."
        searchValue={searchTerm}
        onSearchChange={(val) => {
          onSearchChange(val);
          setPage(1);
        }}
        filters={[
          {
            key: 'status',
            placeholder: 'Todos los estados',
            options: [
              { label: 'Disponibles', value: 'disponible' },
              { label: 'En Monta - Ocupados', value: 'en_monta' }
            ],
            value: statusFilter,
            onChange: setStatusFilter
          }
        ]}
      />

      {content}

      {groupedMales.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(groupedMales.length / limit))}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={!!finishingReproduction}
        onClose={() => setFinishingReproduction(null)}
        onConfirm={handleFinishMating}
        loading={processing}
        title="Finalizar Monta"
        description={
          finishingReproduction ? (
            <>
              ¿Estás seguro de que deseas retirar a la hembra <b>{finishingReproduction.femaleName ? `${finishingReproduction.femaleName} - ${finishingReproduction.femaleCode}` : finishingReproduction.femaleCode}</b> de la jaula del macho? Esto registrará que la monta ha concluido y pasará al estado de Gestación.
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
          description={<>¿Estás seguro de que deseas cancelar esta monta? La coneja quedará libre nuevamente.</>}
          confirmLabel="Sí, cancelar monta"
          variant="danger"
          loading={processing}
        />
      )}
    </div>
  );
}
