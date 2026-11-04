'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertTriangle, Info, ChevronDown, Check } from 'lucide-react';
import { Button, Dialog } from '@/shared/ui';
import { cn } from '@/lib/utils';
import { useIncidents } from '../hooks/useIncidents';
import { cageService } from '@/modules/cages/services/cage.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';
import type { Cage } from '@/modules/cages/types/cage.types';

interface IncidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'Dificultad en la Tarea', label: 'Dificultad en la Tarea' },
  { value: 'Problema en Jaula', label: 'Problema en Jaula' },
  { value: 'Salud del Conejo', label: 'Salud del Conejo' },
  { value: 'Falta de Insumos', label: 'Falta de Insumos' },
  { value: 'Limpieza e Higiene', label: 'Limpieza e Higiene' },
  { value: 'Aviso General', label: 'Aviso General' }
];

const BREEDING_MODULES = [
  { value: 'alimentacion', permissionKey: 'feeding', label: 'Alimentación' },
  { value: 'limpieza', permissionKey: 'cleaning', label: 'Limpieza' },
  { value: 'vacunacion', permissionKey: 'vaccination', label: 'Vacunación' },
  { value: 'desparasitacion', permissionKey: 'deworming', label: 'Desparasitación' },
  { value: 'reproduccion', permissionKey: 'reproduction', label: 'Reproducción' },
  { value: 'mortalidad', permissionKey: 'mortality', label: 'Mortalidad' }
];

export function IncidentFormModal({ isOpen, onClose, onSuccess }: Readonly<IncidentFormModalProps>) {
  const { user } = useAuthContext();
  const { hasPermission, role } = usePermissions();
  const { createIncident, isCreating } = useIncidents({ enabled: false });

  const isOwner = role === 'owner';

  // Filtrar módulos asociados según los permisos de crianza del trabajador
  const availableModules = useMemo(() => {
    const allowed = BREEDING_MODULES.filter((m) => isOwner || hasPermission(m.permissionKey));
    return [
      ...allowed,
      { value: 'general', permissionKey: 'all', label: 'En General' }
    ];
  }, [isOwner, hasPermission]);

  const [cages, setCages] = useState<Cage[]>([]);
  const [loadingCages, setLoadingCages] = useState(false);

  // Estados de campos y buscadores
  const [category, setCategory] = useState('Dificultad en la Tarea');
  const [categorySearch, setCategorySearch] = useState('Dificultad en la Tarea');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [moduleName, setModuleName] = useState('general');
  const [moduleSearch, setModuleSearch] = useState('En General');
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedCageIds, setSelectedCageIds] = useState<number[]>([]);
  const [cageSearch, setCageSearch] = useState('');
  const [showCageDropdown, setShowCageDropdown] = useState(false);
  const cageDropdownRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Opciones filtradas según texto de búsqueda
  const filteredCategories = useMemo(() => {
    const term = categorySearch.toLowerCase().trim();
    const current = CATEGORIES.find((c) => c.value === category);
    if (!term || (current && term === current.label.toLowerCase().trim())) {
      return CATEGORIES;
    }
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(term));
  }, [categorySearch, category]);

  const filteredModules = useMemo(() => {
    const term = moduleSearch.toLowerCase().trim();
    const current = availableModules.find((m) => m.value === moduleName);
    if (!term || (current && term === current.label.toLowerCase().trim())) {
      return availableModules;
    }
    return availableModules.filter((m) => m.label.toLowerCase().includes(term));
  }, [moduleSearch, availableModules, moduleName]);

  const availableCages = useMemo(() => {
    return cages.filter((c) => !selectedCageIds.includes(c.id));
  }, [cages, selectedCageIds]);

  const filteredCages = useMemo(() => {
    const term = cageSearch.toLowerCase().trim();
    if (!term) return availableCages;
    return availableCages.filter((c) => {
      const numStr = String(c.number);
      return numStr.includes(term) || `jaula ${numStr}`.includes(term);
    });
  }, [availableCages, cageSearch]);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setShowCategoryDropdown(false);
        const current = CATEGORIES.find((c) => c.value === category);
        if (current) setCategorySearch(current.label);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(target)) {
        setShowModuleDropdown(false);
        const current = availableModules.find((m) => m.value === moduleName);
        if (current) setModuleSearch(current.label);
      }
      if (cageDropdownRef.current && !cageDropdownRef.current.contains(target)) {
        setShowCageDropdown(false);
        setCageSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [category, moduleName, availableModules]);

  // Cargar jaulas: si es trabajador, solo sus jaulas asignadas desde sus membresías
  useEffect(() => {
    if (isOpen) {
      setLoadingCages(true);

      if (user?.role === 'worker') {
        farmMemberService
          .getMyMemberships()
          .then((memberships) => {
            const activeMembership = (memberships || []).find((m: any) => m.galponId === user?.activeGalponId);
            const assigned = (activeMembership?.assignedCages || [])
              .map((ac: any) => ({
                id: ac.cageId || ac.cage?.id,
                number: ac.cage?.number ?? ac.cageId,
                type: ac.cage?.type || 'Jaula'
              }))
              .filter((c: any) => !!c.id)
              .sort((a: any, b: any) => Number(a.number) - Number(b.number));
            setCages(assigned as any[]);
          })
          .catch(() => setCages([]))
          .finally(() => setLoadingCages(false));
      } else {
        cageService
          .getAll({ limit: 500 })
          .then((res) => {
            const sorted = (res.cages || []).slice().sort((a, b) => a.number - b.number);
            setCages(sorted);
          })
          .catch(() => setCages([]))
          .finally(() => setLoadingCages(false));
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSelectCage = (cageIdNum: number) => {
    if (!selectedCageIds.includes(cageIdNum)) {
      setSelectedCageIds((prev) => [...prev, cageIdNum]);
    }
    setCageSearch('');
  };

  const handleRemoveCage = (cageIdNum: number) => {
    setSelectedCageIds((prev) => prev.filter((id) => id !== cageIdNum));
  };

  const handleClearAllCages = () => {
    setSelectedCageIds([]);
    setCageSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!category.trim()) {
      setError('El tipo de novedad es obligatorio.');
      return;
    }

    if (!moduleName.trim()) {
      setError('La labor es obligatoria.');
      return;
    }

    if (!title.trim()) {
      setError('El motivo de la novedad es obligatorio.');
      return;
    }

    if (!description.trim()) {
      setError('La explicación de la novedad es obligatoria.');
      return;
    }

    try {
      await createIncident({
        category,
        module: moduleName,
        cageIds: selectedCageIds.length > 0 ? selectedCageIds : undefined,
        cageId: selectedCageIds[0] || undefined,
        title: title.trim(),
        description: description.trim()
      });

      setTitle('');
      setDescription('');
      setSelectedCageIds([]);
      setCageSearch('');
      setCategory('Dificultad en la Tarea');
      setCategorySearch('Dificultad en la Tarea');
      setModuleName('general');
      setModuleSearch('En General');
      setShowCategoryDropdown(false);
      setShowModuleDropdown(false);
      setShowCageDropdown(false);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al registrar la novedad.');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Reportar Novedad del Galpón"
      description="Informa sobre cualquier eventualidad o dificultad en las labores"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Categoría con Select Buscador */}
          <div className={cn('relative', showCategoryDropdown ? 'z-50' : 'z-30')} ref={categoryDropdownRef}>
            <label htmlFor="incident-category-input" className="block text-xs font-semibold text-main mb-1.5">
              Tipo de Novedad
            </label>
            <div className="relative">
              <input
                id="incident-category-input"
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setShowCategoryDropdown(true);
                  setShowModuleDropdown(false);
                  setShowCageDropdown(false);
                }}
                onFocus={(e) => {
                  setShowCategoryDropdown(true);
                  setShowModuleDropdown(false);
                  setShowCageDropdown(false);
                  e.target.select();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                placeholder="Escribe o selecciona un tipo..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCategoryDropdown((v) => {
                    const next = !v;
                    if (next) {
                      setShowModuleDropdown(false);
                      setShowCageDropdown(false);
                    }
                    return next;
                  });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-transform duration-200"
              >
                <ChevronDown size={16} className={showCategoryDropdown ? 'rotate-180' : ''} />
              </button>
            </div>

            {showCategoryDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-strong rounded-xl shadow-2xl max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto py-1 animate-fadeIn divide-y divide-default">
                {filteredCategories.length === 0 ? (
                  <p className="px-3.5 py-2.5 text-xs text-muted">No se encontraron resultados</p>
                ) : (
                  filteredCategories.map((cat) => {
                    const isSelected = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value);
                          setCategorySearch(cat.label);
                          setShowCategoryDropdown(false);
                        }}
                        className={cn(
                          'w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors bg-card',
                          isSelected
                            ? 'bg-primary-500/10 text-primary-600 font-semibold dark:bg-primary-500/20'
                            : 'text-main hover:bg-theme-surface'
                        )}
                      >
                        <span className="truncate pr-2">{cat.label}</span>
                        {isSelected && <Check size={14} className="text-primary-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Labor y Jaulas Específicas con Selects Buscadores */}
          <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3 relative', (showModuleDropdown || showCageDropdown) ? 'z-40' : 'z-20')}>
            {/* Labor */}
            <div className={cn('relative', showModuleDropdown ? 'z-50' : 'z-20')} ref={moduleDropdownRef}>
              <label htmlFor="incident-module-input" className="block text-xs font-semibold text-main mb-1.5">
                Labor
              </label>
              <div className="relative">
                <input
                  id="incident-module-input"
                  type="text"
                  value={moduleSearch}
                  onChange={(e) => {
                    setModuleSearch(e.target.value);
                    setShowModuleDropdown(true);
                    setShowCategoryDropdown(false);
                    setShowCageDropdown(false);
                  }}
                  onFocus={(e) => {
                    setShowModuleDropdown(true);
                    setShowCategoryDropdown(false);
                    setShowCageDropdown(false);
                    e.target.select();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  placeholder="Escribe o selecciona una labor..."
                  className="w-full pl-3 pr-9 py-2 text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowModuleDropdown((v) => {
                      const next = !v;
                      if (next) {
                        setShowCategoryDropdown(false);
                        setShowCageDropdown(false);
                      }
                      return next;
                    });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-transform duration-200"
                >
                  <ChevronDown size={16} className={showModuleDropdown ? 'rotate-180' : ''} />
                </button>
              </div>

              {showModuleDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-strong rounded-xl shadow-2xl max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto py-1 animate-fadeIn divide-y divide-default">
                  {filteredModules.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted">No se encontraron resultados</p>
                  ) : (
                    filteredModules.map((m) => {
                      const isSelected = moduleName === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => {
                            setModuleName(m.value);
                            setModuleSearch(m.label);
                            setShowModuleDropdown(false);
                          }}
                          className={cn(
                            'w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors bg-card',
                            isSelected
                              ? 'bg-primary-500/10 text-primary-600 font-semibold dark:bg-primary-500/20'
                              : 'text-main hover:bg-theme-surface'
                          )}
                        >
                          <span className="truncate pr-2">{m.label}</span>
                          {isSelected && <Check size={14} className="text-primary-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Jaulas Específicas Multi-select con buscador */}
            <div className={cn('relative', showCageDropdown ? 'z-50' : 'z-20')} ref={cageDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="incident-cage-input" className="block text-xs font-semibold text-main">
                  Jaulas Específicas
                </label>
                {selectedCageIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllCages}
                    className="text-[11px] text-muted hover:text-red-500 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="incident-cage-input"
                  type="text"
                  value={cageSearch}
                  onChange={(e) => {
                    setCageSearch(e.target.value);
                    setShowCageDropdown(true);
                    setShowCategoryDropdown(false);
                    setShowModuleDropdown(false);
                  }}
                  onFocus={(e) => {
                    setShowCageDropdown(true);
                    setShowCategoryDropdown(false);
                    setShowModuleDropdown(false);
                    e.target.select();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  disabled={loadingCages || (cages.length > 0 && availableCages.length === 0)}
                  placeholder={
                    loadingCages
                      ? 'Cargando jaulas...'
                      : cages.length === 0
                      ? 'Sin jaulas disponibles'
                      : availableCages.length === 0
                      ? 'Todas las jaulas seleccionadas'
                      : selectedCageIds.length === 0
                      ? 'Buscar por número de jaula...'
                      : 'Buscar otra jaula...'
                  }
                  className="w-full pl-3 pr-9 py-2 text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:opacity-60 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!loadingCages && availableCages.length > 0) {
                      setShowCageDropdown((v) => {
                        const next = !v;
                        if (next) {
                          setShowCategoryDropdown(false);
                          setShowModuleDropdown(false);
                        }
                        return next;
                      });
                    }
                  }}
                  disabled={loadingCages || availableCages.length === 0}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-transform duration-200 disabled:opacity-40"
                >
                  <ChevronDown size={16} className={showCageDropdown ? 'rotate-180' : ''} />
                </button>
              </div>

              {showCageDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-strong rounded-xl shadow-2xl max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto py-1 animate-fadeIn divide-y divide-default">
                  {loadingCages ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted">
                      Cargando jaulas...
                    </p>
                  ) : cages.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted">
                      Sin jaulas disponibles
                    </p>
                  ) : availableCages.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted font-medium">
                      No quedan más jaulas disponibles
                    </p>
                  ) : filteredCages.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted">
                      No se encontraron jaulas
                    </p>
                  ) : (
                    filteredCages.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCage(c.id)}
                        className="w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors bg-card text-main hover:bg-theme-surface"
                      >
                        <span className="truncate pr-2 font-medium">Jaula {c.number}</span>
                        <span className="text-[11px] text-primary-600 font-semibold shrink-0">+ Agregar</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Jaulas seleccionadas como recuadros con botón para quitar */}
              {selectedCageIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {selectedCageIds.map((id) => {
                    const c = cages.find((cage) => cage.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/20 border border-default text-xs font-bold text-main"
                      >
                        <span>{c ? c.number : id}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCage(id)}
                          className="text-muted hover:text-red-500 ml-0.5 transition-colors"
                          title="Quitar"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Motivo de la Novedad */}
          <div>
            <label htmlFor="incident-title-input" className="block text-xs font-semibold text-main mb-1.5">
              Motivo de la Novedad
            </label>
            <input
              id="incident-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ejemplo: Bebedero con fuga de agua en jaula 4 o falta de pienso"
              maxLength={180}
              className="w-full px-3 py-2 text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          {/* Descripción / Explicación */}
          <div>
            <label htmlFor="incident-description-input" className="block text-xs font-semibold text-main mb-1.5">
              Explicación Detallada de lo Sucedido
            </label>
            <textarea
              id="incident-description-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica con calma lo sucedido o la razón por la que no se pudo realizar la labor..."
              className="w-full px-3 py-2 text-sm bg-theme-surface border border-strong rounded-xl text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
            />
          </div>

          {/* Texto de apoyo humano sin icono de IA */}
          <div className="p-3 rounded-xl bg-theme-surface border border-default text-xs text-muted flex items-start gap-2.5">
            <Info size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
            <span>
              Este aviso queda guardado para que el propietario conozca la situación y pueda coordinar una solución contigo.
            </span>
          </div>

          {/* Botones de acción responsivos */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-default">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              {isCreating ? 'Guardando...' : 'Registrar Novedad'}
            </Button>
          </div>
        </form>
    </Dialog>
  );
}
