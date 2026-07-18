'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button, Alert, Input } from '@/shared/ui';
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
  'Jaulas',
  'Razas',
  'Conejos',
  'Asignar',
  'Genealogía'
];

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
  'Genealogía'
]);

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

  useEffect(() => {
    const loadWorkerData = async () => {
      if (open && worker) {
        try {
          // Obtener datos actualizados del trabajador con permisos y jaulas
          const workerData = await farmMemberService.getWorkerById(worker.id);
          
          // Cargar permisos existentes del trabajador
          if (workerData.permissions && workerData.permissions.length > 0) {
            const perms: ModulePermissions = {};
            workerData.permissions.forEach((perm: any) => {
              // Convertir nombre de inglés a español normalizado
              const spanishModuleName = mapEnglishToSpanish(perm.moduleName);
              perms[spanishModuleName] = {
                canCreate: perm.canCreate,
                canRead: perm.canRead,
                canUpdate: perm.canUpdate,
                canDelete: perm.canDelete,
              };
            });
            setPermissions(perms);
          } else {
            // Si no tiene permisos, agregar Alimentación por defecto
            setPermissions({
              alimentacion: {
                canCreate: true,
                canRead: true,
                canUpdate: false,
                canDelete: false,
              },
            });
          }
          
          // Cargar jaulas asignadas
          if (workerData.assignedCages && workerData.assignedCages.length > 0) {
            setSelectedCages(workerData.assignedCages.map((wc: any) => wc.cageId));
          }
          
          // Cargar jaulas ocupadas (con conejos asignados)
          loadOccupiedCages();
        } catch (error) {
          console.error('Error al cargar datos del trabajador:', error);
        }
      }
    };
    
    loadWorkerData();
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
    const matchesSearch = c.number.toString().includes(cageSearch) ||
                         c.type.toLowerCase().includes(cageSearch.toLowerCase());
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
              <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-card mt-1">
                {(() => {
                  if (loadingCages) return <p className="text-gray-500 text-sm p-3">Cargando jaulas...</p>;
                  if (filteredCages.length === 0) return <p className="text-gray-500 text-sm p-3">No hay jaulas disponibles</p>;
                  return filteredCages.map(cage => (
                    <button
                      key={cage.id}
                      type="button"
                      onClick={() => handleCageSelect(cage)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                    >
                      {cage.number}  {cage.type.charAt(0).toUpperCase() + cage.type.slice(1)}
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
                  <div key={`cage-${id}`} className="flex items-center gap-1 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 px-2 py-1 rounded text-sm">
                    <span>{cage.number}</span>
                    <button
                      type="button"
                      onClick={() => handleCageRemove(id)}
                      className="text-sky-600 hover:text-sky-800 font-bold"
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
              <div className="absolute z-10 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-card mt-1">
                {filteredPermissions.length === 0 ? (
                  <p className="text-gray-500 text-sm p-3">No hay permisos disponibles</p>
                ) : (
                  filteredPermissions.map((permission: string) => (
                    <button
                      key={permission}
                      type="button"
                      onClick={() => handleSensitivePermissionSelect(permission)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
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
                  <div key={moduleName} className="border border-strong rounded-lg overflow-hidden">
                    <button 
                      type="button"
                      className="w-full text-left bg-transparent border-none outline-none flex justify-between items-center p-3 bg-theme-surface hover:bg-theme-surface border border-default cursor-pointer transition-colors block"
                      onClick={() => handleEditPermission(moduleName, permissionName)}
                    >
                      <div>
                        <span className="font-medium text-main">{permissionName}</span>
                        <div className="text-sm text-muted mt-1">
                          Acciones: {actions.length > 0 ? actions.join(', ') : 'Ninguna'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePermission(moduleName);
                        }}
                        className="text-muted hover:text-red-600 font-bold text-lg"
                      >
                        ×
                      </button>
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
