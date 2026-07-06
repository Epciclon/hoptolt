'use client';

import { useState } from 'react';
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

export function GenealogyTreeModal({ rabbit, onClose }: GenealogyTreeModalProps) {
  const { data: tree, isLoading: loading, error } = useQuery({
    queryKey: ['genealogyTree', rabbit.id],
    queryFn: () => genealogyService.getTree(rabbit.id),
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' && error ? error : '';



  const buildGenerations = (node: GenealogyTree | null, maxLevels: number): (GenealogyTree | null)[][] => {
    if (!node) return [];
    const generations: (GenealogyTree | null)[][] = [[node]];

    for (let level = 0; level < maxLevels; level++) {
      const currentGen = generations[level];
      if (!currentGen) break;
      const nextGen: (GenealogyTree | null)[] = [];

      currentGen.forEach(n => {
        if (n && n.parents) {
          nextGen.push(n.parents.father || null);
          nextGen.push(n.parents.mother || null);
        } else {
          nextGen.push(null);
          nextGen.push(null);
        }
      });

      if (nextGen.some(n => n !== null)) {
        generations.push(nextGen);
      }
    }
    return generations;
  };

  const renderGeneration = (generation: (GenealogyTree | null)[], level: number, nextGeneration?: (GenealogyTree | null)[]): JSX.Element => {
    const bgColor = level === 0 ? 'bg-blue-100 border-blue-300' :
      level === 1 ? 'bg-green-50 border-green-200' :
        'bg-yellow-50 border-yellow-200';

    const padding = 'p-2';
    const fontSize = 'text-xs';
    const minW = 'min-w-[140px]';

    return (
      <div className="flex flex-col items-center w-full">
        <div className="grid w-full gap-x-2" style={{ gridTemplateColumns: `repeat(${generation.length}, minmax(0, 1fr))` }}>
          {generation.map((node, index) => {
            if (!node) {
              return <div key={`null-${level}-${index}`} className={`${minW}`}></div>;
            }

            const isFather = index % 2 === 0;
            const label = level === 0 ? '' : (isFather ? 'Padre' : 'Madre');

            return (
              <div key={node.id} className="flex flex-col items-center">
                <div className={`${padding} border-2 rounded-lg ${fontSize} ${bgColor} ${minW} text-center shadow-sm`}>
                  <div className="flex justify-center mb-2">
                    {node.imageUrl ? (
                      <img src={node.imageUrl} alt={node.name} className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[8px] text-slate-400 text-center leading-tight px-0.5 shadow-sm">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="font-semibold">{node.code}</div>
                  <div className="text-slate-600 truncate">{node.name}</div>
                  {(node.age !== undefined || (node as any).weight !== undefined) && (
                    <div className="flex justify-center gap-2 mt-1 text-[9px] text-slate-500">
                      {node.age !== undefined && <span>Edad: {node.age} {node.age === 1 ? 'mes' : 'meses'}</span>}
                      {(node as any).weight !== undefined && <span>Peso: {(node as any).weight} kg</span>}
                    </div>
                  )}
                  {level === 0 && <div className="text-[10px] font-medium text-slate-500 mt-1">Conejo seleccionado</div>}
                </div>
                {label && <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>}
              </div>
            );
          })}
        </div>

        {nextGeneration && nextGeneration.some(n => n !== null) && (
          <svg className="w-full h-16" style={{ minHeight: '64px' }}>
            {generation.map((node, index) => {
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
                lines.push(<line key={`v-${node.id}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />);
                lines.push(<line key={`h-${node.id}`} x1={`${child1X}%`} y1="50%" x2={`${child2X}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />);
                lines.push(<line key={`v1-${node.id}`} x1={`${child1X}%`} y1="50%" x2={`${child1X}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />);
                lines.push(<line key={`v2-${node.id}`} x1={`${child2X}%`} y1="50%" x2={`${child2X}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />);
              } else if (parentCount === 1) {
                const childX = child1X || child2X;
                if (nodeX !== childX) {
                  lines.push(<line key={`v-${node.id}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />);
                  lines.push(<line key={`h-${node.id}`} x1={`${nodeX}%`} y1="50%" x2={`${childX}%`} y2="50%" stroke="#94a3b8" strokeWidth="2" />);
                  lines.push(<line key={`v1-${node.id}`} x1={`${childX}%`} y1="50%" x2={`${childX}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />);
                } else {
                  lines.push(<line key={`v-${node.id}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />);
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

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={`Árbol Genealógico de ${rabbit.code}${rabbit.name ? ` - ${rabbit.name}` : ''}`}
      size="3xl"
    >
      <div className="flex flex-col h-[70vh]">
        {errorMessage && <Alert variant="error" message={errorMessage} />}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <LoadingMessage message="Cargando árbol genealógico..." />
          </div>
        ) : treeGenerations.length > 0 ? (
          <ZoomableViewer>
            <div className="flex flex-col gap-0 p-8 pb-32 mx-auto" style={{ minWidth: typeof minTreeWidth === 'number' ? `${minTreeWidth}px` : minTreeWidth }}>
              {treeGenerations.map((generation, level) => (
                <div key={level} className="w-full">
                  {renderGeneration(generation, level, treeGenerations[level + 1])}
                </div>
              ))}
            </div>
          </ZoomableViewer>
        ) : (
          !errorMessage && <div className="text-center text-slate-500 py-10">No se encontró información genealógica.</div>
        )}
      </div>
    </Dialog>
  );
}
