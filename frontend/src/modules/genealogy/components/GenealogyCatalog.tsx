'use client';

import { useRabbits } from '@/modules/rabbits/hooks/useRabbits';
import { useRaces } from '@/modules/races/hooks/useRaces';
import { FilterBar } from '@/shared/ui/FilterBar';
import { Pagination } from '@/shared/ui/Pagination';
import { Badge, Button, LoadingMessage, CatalogCard } from '@/shared/ui';
import { useState } from 'react';
import { Network, Edit2 } from 'lucide-react';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import { formatRabbitAge, rabbitSexOptions } from '@/shared/utils/rabbitUtils';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';
import { useRabbitQuickView } from '@/modules/rabbits/contexts/RabbitQuickViewContext';

interface GenealogyCatalogProps {
  onViewTree: (rabbit: Rabbit) => void;
  onEditRelation: (rabbit: Rabbit) => void;
}

export function GenealogyCatalog({ onViewTree, onEditRelation }: Readonly<GenealogyCatalogProps>) {
  const { rabbits, pagination, loading, setPage, setSearch, setRace, setSex, filters } = useRabbits();
  const { races } = useRaces();
  const { can } = usePermissions();
  const quickView = useRabbitQuickView();
  const canUpdate = can('genealogy', 'canUpdate') || can('genealogy', 'canCreate');
  
  const [selectedRabbitId, setSelectedRabbitId] = useState<number | null>(null);

  const toggleRabbitSelection = (rabbitId: number) => {
    setSelectedRabbitId(prev => prev === rabbitId ? null : rabbitId);
  };

  const raceOptions = races.map(r => ({ label: r.name, value: r.name }));

  const renderContent = () => {
    if (loading) return <LoadingMessage message="Cargando genealogías..." />;
    if (rabbits.length === 0) return <p className="text-sm text-muted text-center py-8 bg-theme-surface rounded-lg border border-strong">No hay conejos registrados con esos filtros.</p>;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rabbits.map((rabbit) => {
          const isSelected = selectedRabbitId === rabbit.id;
          return (
          <CatalogCard
            key={rabbit.id}
            imageUrl={rabbit.imageUrl}
            imageAlt={rabbit.name || rabbit.code}
            badge={rabbit.code}
            title={rabbit.name || 'Sin nombre'}
            subtitle={rabbit.race}
            isSelected={isSelected}
            onClick={() => toggleRabbitSelection(rabbit.id)}
            onImageClick={() => {
              void quickView?.openRabbitDetails({ rabbit });
            }}
            topRightAction={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewTree(rabbit);
                }}
                className="bg-slate-900/70 hover:bg-slate-900 text-white p-1.5 rounded-md shadow-sm backdrop-blur-sm transition-colors"
                title="Ver Árbol Genealógico"
              >
                <Network size={16} />
              </button>
            }
            tags={
              <Badge variant={rabbit.sex === 'macho' ? 'primary' : 'success'}>
                {rabbit.sex.charAt(0).toUpperCase() + rabbit.sex.slice(1)}
              </Badge>
            }
            details={
              <div className="grid grid-cols-2 divide-x divide-default/80 bg-theme-surface border border-default/70 rounded-lg py-2 px-1 w-full shadow-inner text-center">
                <div className="flex flex-col items-center justify-center px-1 min-w-0">
                  <span className="text-[11px] text-muted font-medium uppercase tracking-wider leading-none">
                    Edad
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-main mt-1 truncate max-w-full">
                    {formatRabbitAge(rabbit.age)}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center px-1 min-w-0">
                  <span className="text-[11px] text-muted font-medium uppercase tracking-wider leading-none">
                    Peso
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-main mt-1 truncate max-w-full">
                    {rabbit.weight !== undefined && rabbit.weight !== null ? `${rabbit.weight} kg` : '-'}
                  </span>
                </div>
              </div>
            }
            actions={
              canUpdate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[80px] text-main"
                  icon={<Edit2 size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRelation(rabbit);
                  }}
                >
                  Editar Padres
                </Button>
              ) : (
                <span className="text-xs text-muted font-medium py-1 px-2 text-center w-full">
                  Solo consulta
                </span>
              )
            }
          />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        searchValue={filters.search || ''}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Buscar conejo por código o nombre..."
        filters={[
          { key: 'race', placeholder: 'Todas las Razas', options: raceOptions, value: filters.race || '', onChange: (val) => { setRace(val); setPage(1); } },
          { key: 'sex', placeholder: 'Cualquier Sexo', options: rabbitSexOptions, value: filters.sex || '', onChange: (val) => { setSex(val); setPage(1); } }
        ]}
      />

      {renderContent()}

      {!loading && rabbits.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
