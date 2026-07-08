'use client';

import { useState, useEffect } from 'react';
import { Button, Alert, Input, LoadingMessage } from '@/shared/ui';
import { genealogyService } from '../services/genealogy.service';
import { rabbitService } from '@/modules/rabbits/services/rabbit.service';
import type { GenealogyTree } from '../types/genealogy.types';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

interface GenealogyTreeViewProps {
  onCancel?: () => void;
}

export function GenealogyTreeView({ onCancel }: Readonly<GenealogyTreeViewProps>) {
  const [search, setSearch] = useState('');
  const [selectedRabbit, setSelectedRabbit] = useState<Rabbit | null>(null);
  const [tree, setTree] = useState<GenealogyTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [loadingRabbits, setLoadingRabbits] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadRabbits();
  }, []);

  const loadRabbits = async () => {
    try {
      setLoadingRabbits(true);
      const data = await rabbitService.getAll();
      setRabbits(data.rabbits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar conejos');
    } finally {
      setLoadingRabbits(false);
    }
  };

  const handleRabbitSelect = async (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setSearch(`${rabbit.code} - ${rabbit.name}`);
    setShowDropdown(false);

    // Cargar árbol automáticamente
    setError('');
    setLoading(true);
    try {
      const result = await genealogyService.getTree(rabbit.id);
      setTree(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar árbol genealógico');
      setTree(null);
    } finally {
      setLoading(false);
    }
  };

  interface GenSlot {
    node: GenealogyTree | null;
    uid: string;
  }

  const buildGenerations = (node: GenealogyTree | null, maxLevels: number = 6): GenSlot[][] => {
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
    let bgColor = 'bg-yellow-50 border-yellow-200';
    if (level === 0) bgColor = 'bg-blue-100 border-blue-300';
    else if (level === 1) bgColor = 'bg-green-50 border-green-200';

    let padding = 'p-1.5';
    if (level === 0) padding = 'p-3';
    else if (level === 1) padding = 'p-2';

    let fontSize = 'text-[10px]';
    if (level === 0) fontSize = 'text-sm';
    else if (level === 1) fontSize = 'text-xs';

    let minW = 'min-w-[120px]';
    if (level === 0) minW = 'min-w-[160px]';
    else if (level === 1) minW = 'min-w-[140px]';

    return (
      <div className="flex flex-col items-center">
        <div className="flex justify-center gap-8">
          {generation.map((slot) => {
            const { node, uid } = slot;
            
            if (!node) {
              return <div key={uid} className={`${minW}`}></div>;
            }

            let label = '';
            if (level !== 0) {
              const isFather = uid.endsWith('-F');
              label = isFather ? 'Padre' : 'Madre';
            }

            return (
              <div key={uid} className="flex flex-col items-center">
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
                  lines.push(
                    <line key={`v-${uid}`} x1={`${nodeX}%`} y1="0" x2={`${nodeX}%`} y2="100%" stroke="#94a3b8" strokeWidth="2" />
                  );
                }
              }

              return lines;
            })}
          </svg>
        )}
      </div>
    );
  };

  const filteredRabbits = rabbits.filter(r =>
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingRabbits) return <LoadingMessage message="Cargando conejos..." />;

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}

      <div className="relative">
        <Input
          placeholder="Buscar por código o nombre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && filteredRabbits.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10">
            {filteredRabbits.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRabbitSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
              >
                {r.code} - {r.name} ({r.age} meses, {r.race})
              </button>
            ))}
          </div>
        )}
      </div>

      {tree && (
        <div className="border border-slate-200 rounded-md p-4 bg-slate-50 overflow-auto max-h-[600px]">
          <h3 className="font-semibold mb-3">Árbol Genealógico</h3>
          <div className="min-w-full flex flex-col gap-0">
            {buildGenerations(tree, 6).map((generation, level) => (
              <div key={generation.map(s => s.uid).join('-')}>
                {renderGeneration(generation, level, buildGenerations(tree, 6)[level + 1])}
              </div>
            ))}
          </div>
        </div>
      )}

      {!tree && !loading && selectedRabbit && (
        <div className="text-center text-slate-500 py-4">
          Haz clic en "Buscar" para ver el árbol genealógico
        </div>
      )}

      <Button type="button" variant="secondary" onClick={onCancel} className="mt-4">
        Cerrar
      </Button>
    </div>
  );
}
