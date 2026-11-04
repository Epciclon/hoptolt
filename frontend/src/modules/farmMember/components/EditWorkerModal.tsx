'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button, Alert, Input } from '@/shared/ui';
import { Sprout, Sparkles, ShieldCheck, Layers, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PermissionActionModal } from './PermissionActionModal';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '../services/farmMember.service';
import type { FarmMember } from '../types/farmMember.types';

interface EditWorkerModalProps {
  open: boolean;
  onClose: () => void;
  worker: FarmMember | null;
  onSave: (data: any) => Promise<void>;
}

interface ModulePermissions {
  [key: string]: {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
}

// Todos los permisos disponibles
const ALL_PERMISSIONS = [
  'Alimentación',
  'Vacunación',
  'Desparasitación',
  'Limpieza',
  'Mortalidad',
  'Reproducción y Parto',
  'Reportes',
  'Jaulas',
  'Razas',
  'Conejos',
  'Asignar',
  'Genealogía'
];

type PresetKey = 'crianza' | 'crianza_avanzada' | 'gestion_control' | 'acceso_total';

interface PresetDefinition {
  key: PresetKey;
  name: string;
  badge: string;
  description: string;
  icon: any;
  permissions: ModulePermissions;
}

// Plantillas predeterminadas de asignación rápida (ninguna incluye canDelete)
const PRESET_TEMPLATES: Record<PresetKey, PresetDefinition> = {
  crianza: {
    key: 'crianza',
    name: 'Crianza',
    badge: '6 módulos',
    description: 'Operaciones diarias de campo sin edición ni eliminación',
    icon: Sprout,
    permissions: {
      alimentacion: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      vacunacion: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      desparasitacion: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      limpieza: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      mortalidad: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      reproduccionyparto: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
    },
  },
  crianza_avanzada: {
    key: 'crianza_avanzada',
    name: 'Crianza Avanzada',
    badge: '2 módulos',
    description: 'Edición en reproducción y acceso a reportes',
    icon: Sparkles,
    permissions: {
      reproduccionyparto: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      reportes: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
    },
  },
  gestion_control: {
    key: 'gestion_control',
    name: 'Gestión y Control',
    badge: '6 módulos',
    description: 'Módulos maestros y sensibles sin eliminación',
    icon: ShieldCheck,
    permissions: {
      reportes: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      jaulas: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      razas: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      conejos: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      asignar: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      genealogia: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    },
  },
  acceso_total: {
    key: 'acceso_total',
    name: 'Acceso Total',
    badge: '12 módulos',
    description: 'Todos los módulos activos sin eliminación',
    icon: Layers,
    permissions: {
      alimentacion: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      vacunacion: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      desparasitacion: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      limpieza: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      mortalidad: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      reproduccionyparto: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      reportes: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      jaulas: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      razas: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      conejos: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      asignar: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      genealogia: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    },
  },
};

// Función para comparar si un conjunto de permisos coincide con una plantilla
const arePermissionsEqual = (a: ModulePermissions, b: ModulePermissions): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const permA = a[key];
    const permB = b[key];
    if (!permB) return false;
    if (
      Boolean(permA.canCreate) !== Boolean(permB.canCreate) ||
      Boolean(permA.canRead) !== Boolean(permB.canRead) ||
      Boolean(permA.canUpdate) !== Boolean(permB.canUpdate) ||
      Boolean(permA.canDelete) !== Boolean(permB.canDelete)
    ) {
      return false;
    }
  }
  return true;
};

// Función para normalizar el nombre del módulo (sin tildes, sin espacios)
const normalizeModuleName = (name: string) => {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .replace(/\s/g, ''); // Eliminar espacios
};

// Mapeo de nombres en español a nombres en inglés para el backend
const mapSpanishToEnglish = (spanishName: string): string => {
  const mapping: { [key: string]: string } = {
    'alimentacion': 'feeding',
    'vacunacion': 'vaccination',
    'desparasitacion': 'deworming',
    'limpieza': 'cleaning',
    'mortalidad': 'mortality',
    'reproduccionyparto': 'reproduction',
    'reportes': 'reports',
    'jaulas': 'cages',
    'razas': 'races',
    'conejos': 'rabbits',
    'asignar': 'assignments',
    'genealogia': 'genealogy',
    'usuarios': 'farmMembers',
    'galpones': 'galpones'
  };
  
  const normalized = normalizeModuleName(spanishName);
  return mapping[normalized] || normalized;
};

// Mapeo inverso de nombres en inglés a nombres en español normalizados para el frontend
const mapEnglishToSpanish = (englishName: string): string => {
  const mapping: { [key: string]: string } = {
    'feeding': 'alimentacion',
    'vaccination': 'vacunacion',
    'deworming': 'desparasitacion',
    'cleaning': 'limpieza',
    'mortality': 'mortalidad',
    'reproduction': 'reproduccionyparto',
    'reports': 'reportes',
    'cages': 'jaulas',
    'races': 'razas',
    'rabbits': 'conejos',
    'assignments': 'asignar',
    'genealogy': 'genealogia'
  };
  
  return mapping[englishName] || englishName;
};

// Permisos sensibles (requieren advertencia)
const SENSITIVE_PERMISSIONS = new Set([
  'Jaulas',
  'Razas',
  'Conejos',
  'Asignar',
  'Genealogía',
  'Reportes'
]);

// Combinar permisos de múltiples plantillas activas sin otorgar nunca canDelete
function mergePermissions(presetKeys: PresetKey[], baseline: ModulePermissions): ModulePermissions {
  if (presetKeys.length === 0) {
    return { ...baseline };
  }

  const result: ModulePermissions = {};

  presetKeys.forEach((key) => {
    const templatePerms = PRESET_TEMPLATES[key].permissions;
    Object.keys(templatePerms).forEach((moduleKey) => {
      const perm = templatePerms[moduleKey];
      if (!result[moduleKey]) {
        result[moduleKey] = { ...perm };
      } else {
        result[moduleKey] = {
          canCreate: result[moduleKey].canCreate || perm.canCreate,
          canRead: result[moduleKey].canRead || perm.canRead,
          canUpdate: result[moduleKey].canUpdate || perm.canUpdate,
          canDelete: false,
        };
      }
    });
  });

  return result;
}

function parseWorkerPermissions(permissions: any[]): ModulePermissions {
  const perms: ModulePermissions = {};
  permissions.forEach((perm: any) => {
    const spanishModuleName = mapEnglishToSpanish(perm.moduleName);
    perms[spanishModuleName] = {
      canCreate: perm.canCreate,
      canRead: perm.canRead,
      canUpdate: perm.canUpdate,
      canDelete: perm.canDelete,
    };
  });
  return perms;
}

function detectMatchingPresets(perms: ModulePermissions): PresetKey[] {
  if (arePermissionsEqual(perms, PRESET_TEMPLATES.acceso_total.permissions)) {
    return ['acceso_total'];
  }
  const candidates: PresetKey[] = ['crianza', 'crianza_avanzada', 'gestion_control'];
  const matching: PresetKey[] = [];

  candidates.forEach((cand) => {
    const candPerms = PRESET_TEMPLATES[cand].permissions;
    const allModulesMatch = Object.keys(candPerms).every((mod) => {
      const target = perms[mod];
      const source = candPerms[mod];
      if (!target) return false;
      return (
        (!source.canCreate || target.canCreate) &&
        (!source.canRead || target.canRead) &&
        (!source.canUpdate || target.canUpdate)
      );
    });
    if (allModulesMatch) {
      matching.push(cand);
    }
  });

  if (matching.length > 0) {
    const merged = mergePermissions(matching, {});
    if (arePermissionsEqual(perms, merged)) {
      return matching;
    }
  }
  return [];
}

export function EditWorkerModal({ open, onClose, worker, onSave }: Readonly<EditWorkerModalProps>) {
  const [permissions, setPermissions] = useState<ModulePermissions>({});
  const [selectedCages, setSelectedCages] = useState<number[]>([]);
  const [occupiedCages, setOccupiedCages] = useState<any[]>([]);
  const [loadingCages, setLoadingCages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cageSearch, setCageSearch] = useState('');
  const [showCageDropdown, setShowCageDropdown] = useState(false);
  const [sensitivePermissionSearch, setSensitivePermissionSearch] = useState('');
  const [showSensitiveDropdown, setShowSensitiveDropdown] = useState(false);
  const [showPermissionActionModal, setShowPermissionActionModal] = useState(false);
  const [selectedAdvancedPermission, setSelectedAdvancedPermission] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<{ canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean } | null>(null);
  
  const cageDropdownRef = useRef<HTMLDivElement>(null);
  const sensitiveDropdownRef = useRef<HTMLDivElement>(null);
  const baselinePermissionsRef = useRef<ModulePermissions>({});
  const [selectedPresets, setSelectedPresets] = useState<PresetKey[]>([]);

  const handleTogglePreset = (presetKey: PresetKey) => {
    let nextSelected: PresetKey[] = [];

    if (presetKey === 'acceso_total') {
      // Si se presiona Acceso Total
      if (selectedPresets.includes('acceso_total')) {
        // Si ya estaba activo, se deselecciona
        nextSelected = [];
      } else {
        // Solo Acceso Total elimina las selecciones de las otras 3 plantillas
        nextSelected = ['acceso_total'];
      }
    } else {
      // Es una de las otras 3: Crianza, Crianza Avanzada o Gestión y Control
      // Si Acceso Total estaba activo, se deselecciona automáticamente
      const withoutTotal = selectedPresets.filter((k) => k !== 'acceso_total');

      if (withoutTotal.includes(presetKey)) {
        // Si ya estaba seleccionado, se deselecciona
        nextSelected = withoutTotal.filter((k) => k !== presetKey);
      } else {
        // Se añade libremente, permitiendo combinar Crianza, Crianza Avanzada y Gestión y Control
        nextSelected = [...withoutTotal, presetKey];
      }
    }

    setSelectedPresets(nextSelected);

    if (nextSelected.length === 0) {
      setPermissions({ ...baselinePermissionsRef.current });
    } else {
      const newPerms = mergePermissions(nextSelected, baselinePermissionsRef.current);
      setPermissions(newPerms);
    }
  };

  useEffect(() => {
    const loadWorkerData = async () => {
      if (open && worker) {
        try {
          // Obtener datos actualizados del trabajador con permisos y jaulas
          const workerData = await farmMemberService.getWorkerById(worker.id);
          
          // Cargar permisos existentes del trabajador
          if (workerData.permissions && workerData.permissions.length > 0) {
            const perms = parseWorkerPermissions(workerData.permissions);
            setPermissions(perms);
            baselinePermissionsRef.current = perms;
            setSelectedPresets(detectMatchingPresets(perms));
          } else {
            // Si no tiene permisos, agregar Alimentación por defecto
            const defaultPerms: ModulePermissions = {
              alimentacion: {
                canCreate: true,
                canRead: true,
                canUpdate: false,
                canDelete: false,
              },
            };
            setPermissions(defaultPerms);
            baselinePermissionsRef.current = defaultPerms;
            setSelectedPresets([]);
          }
          
          // Cargar jaulas asignadas
          if (workerData.assignedCages && workerData.assignedCages.length > 0) {
            setSelectedCages(workerData.assignedCages.map((wc: any) => wc.cageId));
          }
          
          // Cargar jaulas ocupadas (con conejos asignados)
          await loadOccupiedCages();
        } catch (error) {
          console.error('Error al cargar datos del trabajador:', error);
        }
      }
    };
    
    void loadWorkerData();
  }, [open, worker]);

  const loadOccupiedCages = async () => {
    setLoadingCages(true);
    try {
      const assignedRabbits = await assignmentService.getAssignedRabbits();
      // Extraer jaulas únicas que tienen conejos asignados
      const cagesMap = new Map();
      assignedRabbits.forEach((rabbit: any) => {
        if (rabbit.cageId && !cagesMap.has(rabbit.cageId)) {
          cagesMap.set(rabbit.cageId, {
            id: rabbit.cageId,
            number: rabbit.cageNumber,
            type: rabbit.cageType
          });
        }
      });
      setOccupiedCages(Array.from(cagesMap.values()));
    } catch (error) {
      console.error('Error loading occupied cages:', error);
    } finally {
      setLoadingCages(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convertir el objeto de permisos a un array que el backend espera
      const permissionsArray = Object.keys(permissions).map(moduleName => ({
        moduleName: mapSpanishToEnglish(moduleName),
        canCreate: permissions[moduleName].canCreate,
        canRead: permissions[moduleName].canRead,
        canUpdate: permissions[moduleName].canUpdate,
        canDelete: permissions[moduleName].canDelete,
      }));
      
      await onSave({
        permissions: permissionsArray,
        cageIds: selectedCages,
      });
      onClose();
    } catch (error) {
      console.error('Error saving worker:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCageSelect = (cage: any) => {
    if (!selectedCages.includes(cage.id)) {
      setSelectedCages([...selectedCages, cage.id]);
    }
    setCageSearch('');
    setShowCageDropdown(false);
  };

  const handleCageRemove = (cageId: number) => {
    setSelectedCages(selectedCages.filter(id => id !== cageId));
  };

  const handleSensitivePermissionSelect = (permissionName: string) => {
    setSelectedAdvancedPermission(permissionName);
    setShowPermissionActionModal(true);
    setSensitivePermissionSearch('');
    setShowSensitiveDropdown(false);
  };

  const handlePermissionActionConfirm = (actionPermissions: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }) => {
    if (selectedAdvancedPermission) {
      const moduleName = normalizeModuleName(selectedAdvancedPermission);
      setPermissions({
        ...permissions,
        [moduleName]: actionPermissions,
      });
    }
    setShowPermissionActionModal(false);
    setSelectedAdvancedPermission(null);
  };

  const handleEditPermission = (moduleName: string, permissionName: string) => {
    setSelectedAdvancedPermission(permissionName);
    setEditingPermissions(permissions[moduleName]);
    setShowPermissionActionModal(true);
  };

  const handleRemovePermission = (moduleName: string) => {
    const newPermissions = { ...permissions };
    delete newPermissions[moduleName];
    setPermissions(newPermissions);

    // Si se quitó un módulo de una plantilla activa, desmarcar esa plantilla
    setSelectedPresets((prev) =>
      prev.filter((key) => {
        const templatePerms = PRESET_TEMPLATES[key].permissions;
        return !templatePerms[moduleName];
      })
    );
  };

  const handleClearAllPermissions = () => {
    setPermissions({});
    setSelectedPresets([]);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (cageDropdownRef.current && !cageDropdownRef.current.contains(target)) {
        setShowCageDropdown(false);
      }
      if (sensitiveDropdownRef.current && !sensitiveDropdownRef.current.contains(target)) {
        setShowSensitiveDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCages = occupiedCages.filter(c => {
    const clean = cageSearch.trim().toLowerCase().replace(/^jaula\s*/i, "");
    const matchesSearch = clean === "" || c.number.toString() === clean || c.number.toString().includes(clean) || c.type.toLowerCase().includes(clean);
    const notSelected = !selectedCages.includes(c.id);
    return matchesSearch && notSelected;
  });

  const filteredPermissions = ALL_PERMISSIONS.filter((p: string) => {
    const moduleName = normalizeModuleName(p);
    const notSelected = !permissions[moduleName];
    const matchesSearch = p.toLowerCase().includes(sensitivePermissionSearch.toLowerCase());
    return notSelected && matchesSearch;
  });

  return (
    <Dialog open={open} onClose={onClose} title={`Editar Trabajador: ${worker?.profile?.fullName}`} size="xl">
      <div className="space-y-6">
        <Alert
          variant="neutral"
          message="Configura los permisos y jaulas asignadas para este trabajador"
        />

        {/* Asignación de Jaulas */}
        <div>
          <h3 className="font-semibold text-main mb-3">Jaulas Asignadas</h3>
          <p className="text-sm text-muted mb-3">
            El trabajador solo podrá ver y gestionar las jaulas que le asigne y estará a cargo de ellas.
          </p>
          <div className="relative" ref={cageDropdownRef}>
            <Input
              placeholder="Busca por número o tipo de jaula"
              value={cageSearch}
              onChange={(e) => {
                setCageSearch(e.target.value);
                setShowCageDropdown(true);
              }}
              onFocus={() => setShowCageDropdown(true)}
              disabled={loadingCages}
            />
            {showCageDropdown && (
              <div className="absolute z-20 w-full border border-default rounded-lg max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto bg-card shadow-lg mt-1 divide-y divide-default">
                {(() => {
                  if (loadingCages) return <p className="text-muted text-sm p-3">Cargando jaulas...</p>;
                  if (filteredCages.length === 0) return <p className="text-muted text-sm p-3">No hay jaulas disponibles</p>;
                  return filteredCages.map(cage => (
                    <button
                      key={cage.id}
                      type="button"
                      onClick={() => handleCageSelect(cage)}
                      className="w-full text-left px-3.5 py-2.5 text-main hover:bg-theme-surface dark:hover:bg-slate-800/80 focus:bg-theme-surface dark:focus:bg-slate-800/80 outline-none text-sm transition-colors cursor-pointer block bg-transparent"
                    >
                      {cage.number} - {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)}
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
          {selectedCages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCages.map(id => {
                const cage = occupiedCages.find(c => c.id === id);
                if (!cage) return null;
                return (
                  <div key={`cage-${id}`} className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-2.5 py-1 rounded text-sm font-medium">
                    <span>{cage.number}</span>
                    <button
                      type="button"
                      onClick={() => handleCageRemove(id)}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {occupiedCages.length === 0 && !loadingCages && (
            <p className="text-sm text-muted text-center py-4">
              No hay jaulas con conejos asignados en este galpón.
            </p>
          )}
        </div>

        {/* Permisos del Trabajador */}
        <div>
          <h3 className="font-semibold text-main mb-3">Permisos del Trabajador</h3>
          <p className="text-sm text-muted mb-3">
            Permisos para realizar las operaciones diarias de control del galpón.
          </p>
          
          {/* Plantillas de Asignación Rápida */}
          <div className="mb-5">
            <div className="mb-2.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Plantillas de Asignación Rápida
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {(Object.keys(PRESET_TEMPLATES) as PresetKey[]).map((key) => {
                const preset = PRESET_TEMPLATES[key];
                const Icon = preset.icon;
                const isSelected = selectedPresets.includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTogglePreset(key)}
                    className={cn(
                      'group relative p-3 rounded-xl border text-left transition-all duration-200 outline-none cursor-pointer flex flex-col justify-between min-h-[102px]',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/50'
                        : 'border-default bg-card hover:bg-theme-surface hover:border-strong dark:hover:border-slate-700'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                              : 'bg-theme-surface text-muted group-hover:text-main dark:bg-slate-800'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full transition-colors',
                            isSelected
                              ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : 'bg-theme-surface text-muted dark:bg-slate-800 dark:text-slate-400'
                          )}
                        >
                          {preset.badge}
                        </span>
                      </div>

                      <h4
                        className={cn(
                          'text-sm font-semibold leading-snug transition-colors',
                          isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-main'
                        )}
                      >
                        {preset.name}
                      </h4>

                      <p
                        className={cn(
                          'text-xs mt-1 leading-relaxed transition-colors',
                          isSelected
                            ? 'text-emerald-700 dark:text-emerald-300/80'
                            : 'text-muted'
                        )}
                      >
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-dashed border-default/70 flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          'font-medium transition-colors',
                          isSelected
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-muted group-hover:text-main'
                        )}
                      >
                        {isSelected ? 'Clic para quitar' : 'Clic para aplicar'}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Buscador para agregar permisos */}
          <div className="relative mb-4" ref={sensitiveDropdownRef}>
            <Input
              placeholder="Buscar permiso..."
              value={sensitivePermissionSearch}
              onChange={(e) => {
                setSensitivePermissionSearch(e.target.value);
                setShowSensitiveDropdown(true);
              }}
              onFocus={() => setShowSensitiveDropdown(true)}
            />
            {showSensitiveDropdown && (
              <div className="absolute z-20 w-full border border-default rounded-lg max-h-36 sm:max-h-48 xl:max-h-60 overflow-y-auto bg-card shadow-lg mt-1 divide-y divide-default">
                {filteredPermissions.length === 0 ? (
                  <p className="text-muted text-sm p-3">No hay permisos disponibles</p>
                ) : (
                  filteredPermissions.map((permission: string) => (
                    <button
                      key={permission}
                      type="button"
                      onClick={() => handleSensitivePermissionSelect(permission)}
                      className="w-full text-left px-3.5 py-2.5 text-main hover:bg-theme-surface dark:hover:bg-slate-800/80 focus:bg-theme-surface dark:focus:bg-slate-800/80 outline-none text-sm transition-colors cursor-pointer block bg-transparent"
                    >
                      {permission}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Permisos agregados con sus acciones */}
          {Object.keys(permissions).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5 pb-1 border-b border-default">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Permisos asignados: {Object.keys(permissions).length}
                </span>
                <button
                  type="button"
                  onClick={handleClearAllPermissions}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Quitar todos los permisos</span>
                </button>
              </div>
              {Object.keys(permissions).reverse().map(moduleName => {
                const permissionName = ALL_PERMISSIONS.find((p: string) => 
                  normalizeModuleName(p) === moduleName
                );
                if (!permissionName) return null;
                
                const perm = permissions[moduleName];
                const actions = [];
                if (perm.canCreate) actions.push('Crear');
                if (perm.canRead) actions.push('Consultar');
                if (perm.canUpdate) actions.push('Editar');
                if (perm.canDelete) actions.push('Eliminar');
                
                return (
                  <div key={moduleName} className="border border-default rounded-lg overflow-hidden flex items-center justify-between p-3 bg-theme-surface hover:bg-theme-surface/80 transition-colors">
                    <button 
                      type="button"
                      className="flex-1 text-left bg-transparent border-none outline-none cursor-pointer p-0"
                      onClick={() => handleEditPermission(moduleName, permissionName)}
                    >
                      <div>
                        <span className="font-medium text-main">{permissionName}</span>
                        <div className="text-sm text-muted mt-1">
                          Acciones: {actions.length > 0 ? actions.join(', ') : 'Ninguna'}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePermission(moduleName);
                      }}
                      className="text-muted hover:text-red-600 font-bold text-lg p-1 transition-colors"
                      title="Eliminar permiso"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 pt-4 border-t border-strong">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Modal para seleccionar acciones de permisos avanzados */}
      <PermissionActionModal
        open={showPermissionActionModal}
        onClose={() => {
          setShowPermissionActionModal(false);
          setSelectedAdvancedPermission(null);
          setEditingPermissions(null);
        }}
        onConfirm={handlePermissionActionConfirm}
        moduleName={selectedAdvancedPermission || ''}
        isSensitive={SENSITIVE_PERMISSIONS.has(selectedAdvancedPermission || '')}
        existingPermissions={editingPermissions || undefined}
      />
    </Dialog>
  );
}
