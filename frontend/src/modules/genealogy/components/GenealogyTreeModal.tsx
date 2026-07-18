'use client';

import { useQuery } from '@tanstack/react-query';
import { Dialog, Alert, LoadingMessage } from '@/shared/ui';
import { genealogyService } from '../services/genealogy.service';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';
import type { GenealogyTree } from '../types/genealogy.types';
import { ZoomableViewer } from './ZoomableViewer';

interface GenealogyTreeModalProps {
  rabbit: Rabbit;
  onClose: () => void;
}

export function GenealogyTreeModal({ rabbit, onClose }: Readonly<GenealogyTreeModalProps>) {
  const { data: tree, isLoading: loading, error } = useQuery({
    queryKey: ['genealogyTree', rabbit.id],
    queryFn: () => genealogyService.getTree(rabbit.id),
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string' && error) {
    errorMessage = error;
  }



  interface GenSlot {
    node: GenealogyTree | null;
    uid: string;
  }

  const buildGenerations = (node: GenealogyTree | null, maxLevels: number): GenSlot[][] => {
    if (!node) return [];
    const generations: GenSlot[][] = [[{ node, uid: 'root' }]];

    for (let level = 0; level < maxLevels; level++) {
      const currentGen = generations[level];
      if (!currentGen) break;
      const nextGen: GenSlot[] = [];

      currentGen.forEach(slot => {
        if (slot.node?.parents) {
          nextGen.push(
            { node: slot.node.parents.father || null, uid: `${slot.uid}-F` },
            { node: slot.node.parents.mother || null, uid: `${slot.uid}-M` }
          );
        } else {
          nextGen.push(
            { node: null, uid: `${slot.uid}-F` },
            { node: null, uid: `${slot.uid}-M` }
          );
        }
      });

      if (nextGen.some(slot => slot.node !== null)) {
        generations.push(nextGen);
      }
    }
    return generations;
  };

  const renderGeneration = (generation: GenSlot[], level: number, nextGeneration?: GenSlot[]): JSX.Element => {
    let bgColor = 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700/50';
    if (level === 0) bgColor = 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700/50';
    else if (level === 1) bgColor = 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/50';

    const padding = 'p-2';
    const fontSize = 'text-xs';
    const minW = 'min-w-[140px]';

    return (
      <div className="flex flex-col items-center w-full">
        <div className="grid w-full gap-x-2" style={{ gridTemplateColumns: `repeat(${generation.length}, minmax(0, 1fr))` }}>
          {generation.map((slot) => {
            const { node, uid } = slot;
            
            if (!node) {
              return <div key={uid} className={`${minW}`}></div>;
            }

            const isFather = uid.endsWith('-F');
            let label = '';
            if (level !== 0) {
              label = isFather ? 'Padre' : 'Madre';
            }

            return (
              <div key={uid} className="flex flex-col items-center">
                <div className={`${padding} border-2 rounded-lg ${fontSize} ${bgColor} ${minW} text-center shadow-sm`}>
                  <div className="flex justify-center mb-2">
                    {node.imageUrl ? (
                      <img src={node.imageUrl} alt={node.name} className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-theme-surface border border-default border border-slate-300 flex items-center justify-center text-[8px] text-theme-faint text-center leading-tight px-0.5 shadow-sm">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="font-semibold">{node.code}</div>
                  <div className="text-muted truncate">{node.name}</div>
                  {(node.age !== undefined || (node as any).weight !== undefined) && (
                    <div className="flex justify-center gap-2 mt-1 text-[9px] text-muted">
                      {node.age !== undefined && <span>Edad: {node.age} {node.age === 1 ? 'mes' : 'meses'}</span>}
                      {(node as any).weight !== undefined && <span>Peso: {(node as any).weight} kg</span>}
                    </div>
                  )}
                  {level === 0 && <div className="text-[10px] font-medium text-muted mt-1">Conejo seleccionado</div>}
                </div>
                {label && <div className="text-xs text-muted font-medium mt-1">{label}</div>}
              </div>
            );
          })}
        </div>

        {nextGeneration && nextGeneration.some(slot => slot.node !== null) && (
          <svg className="w-full h-16" style={{ minHeight: '64px' }}>
            {generation.map((slot, index) => {
              const { node, uid } = slot;
              if (!node) return null;

              const childIndex1 = index * 2;
              const childIndex2 = index * 2 + 1;
              const child1 = nextGeneration[childIndex1];
              const child2 = nextGeneration[childIndex2];

              if (!child1 && !child2) return null;

              const nodeX = (index + 0.5) * (100 / generation.length);
              const child1X = child1 ? (childIndex1 + 0.5) * (100 / nextGeneration.length) : null;
              const child2X = child2 ? (childIndex2 + 0.5) * (100 / nextGeneration.length) : null;

              const parentCount = (child1 ? 1 : 0) + (child2 ? 1 : 0);
              const lines = [];

              if (parentCount === 2) {
                lines.push(
                  <line key={`v-${uid}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />,
                  <line key={`h-${uid}`} x1={`${child1X}%`} y1="50%" x2={`${child2X}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />,
                  <line key={`v1-${uid}`} x1={`${child1X}%`} y1="50%" x2={`${child1X}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />,
                  <line key={`v2-${uid}`} x1={`${child2X}%`} y1="50%" x2={`${child2X}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />
                );
              } else if (parentCount === 1) {
                const childX = child1X || child2X;
                if (nodeX !== childX) {
                  lines.push(
                    <line key={`v-${uid}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />,
                    <line key={`h-${uid}`} x1={`${nodeX}%`} y1="50%" x2={`${childX}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />,
                    <line key={`v1-${uid}`} x1={`${childX}%`} y1="50%" x2={`${childX}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />
                  );
                } else {
                  lines.push(<line key={`v-${uid}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />);
                }
              }

              return lines;
            })}
          </svg>
        )}
      </div>
    );
  };

  const getMaxDepth = (node: GenealogyTree | null): number => {
    if (!node) return 0;
    let depth = 1;
    if (node.parents) {
      depth += Math.max(
        getMaxDepth(node.parents.father || null),
        getMaxDepth(node.parents.mother || null)
      );
    }
    return depth;
  };

  const actualLevels = tree ? getMaxDepth(tree) : 0;
  const treeGenerations = tree ? buildGenerations(tree, actualLevels) : [];
  // Calculamos el ancho mínimo basándonos en la generación más ancha (nivel máximo)
  // Cada nodo necesita unos 160px de espacio para que no haya colisiones.
  const minTreeWidth = actualLevels > 0 ? Math.pow(2, actualLevels - 1) * 160 : '100%';

  const modalTitle = rabbit.name ? `Árbol Genealógico de ${rabbit.code} - ${rabbit.name}` : `Árbol Genealógico de ${rabbit.code}`;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={modalTitle}
      size="3xl"
    >
      <div className="flex flex-col h-[70vh]">
        {errorMessage && <Alert variant="error" message={errorMessage} />}
        {loading && (
          <div className="flex items-center justify-center flex-1">
            <LoadingMessage message="Cargando árbol genealógico..." />
          </div>
        )}
        {!loading && treeGenerations.length > 0 && (
          <ZoomableViewer>
            <div className="flex flex-col gap-0 p-8 pb-32 mx-auto" style={{ minWidth: typeof minTreeWidth === 'number' ? `${minTreeWidth}px` : minTreeWidth }}>
              {treeGenerations.map((generation, level) => (
                <div key={generation.map(s => s.uid).join('-')} className="w-full">
                  {renderGeneration(generation, level, treeGenerations[level + 1])}
                </div>
              ))}
            </div>
          </ZoomableViewer>
        )}
        {!loading && treeGenerations.length === 0 && !errorMessage && (
          <div className="text-center text-muted py-10">No se encontró información genealógica.</div>
        )}
      </div>
    </Dialog>
  );
}
