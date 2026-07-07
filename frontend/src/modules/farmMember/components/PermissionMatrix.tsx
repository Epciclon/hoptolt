'use client';

import { useState } from 'react';

interface Permission {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface ModulePermissions {
  [key: string]: Permission;
}

interface PermissionMatrixProps {
  permissions: ModulePermissions;
  onChange: (permissions: ModulePermissions) => void;
  modules?: string[];
}

const MODULES = {
  jaulas: 'Jaulas',
  razas: 'Razas',
  conejos: 'Conejos',
  arbol_genealogico: 'Árbol Genealógico',
  asignar_jaula: 'Asignar Jaula',
  alimentacion: 'Alimentación',
  vacunacion: 'Vacunación',
  desparasitacion: 'Desparasitación',
  crecimiento: 'Crecimiento',
  limpieza: 'Limpieza',
  mortalidad: 'Mortalidad',
  reproduccion: 'Reproducción y Parto',
  reportes: 'Reportes',
  galpones: 'Gestionar Galpones',
};

const ACTIONS = ['canCreate', 'canRead', 'canUpdate', 'canDelete'] as const;
const ACTION_LABELS = {
  canCreate: 'Crear',
  canRead: 'Consultar',
  canUpdate: 'Editar',
  canDelete: 'Eliminar',
};

export function PermissionMatrix({ permissions, onChange, modules }: PermissionMatrixProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Usar los módulos proporcionados o los por defecto
  const modulesToUse = modules || Object.keys(MODULES);

  // Determinar qué acciones mostrar según las props
  const getAvailableActions = (moduleName: string) => {
    const allActions = ['canCreate', 'canRead', 'canUpdate', 'canDelete'] as const;
    const moduleLabel = MODULES[moduleName as keyof typeof MODULES];
    
    const twoActionsModules = ['Alimentación', 'Vacunación', 'Desparasitación', 'Limpieza', 'Mortalidad'];
    const threeActionsModules = ['Asignar Jaula'];
    
    if (twoActionsModules.includes(moduleLabel)) {
      return allActions.filter(action => action === 'canCreate' || action === 'canRead');
    }
    
    if (threeActionsModules.includes(moduleLabel)) {
      return allActions.filter(action => action !== 'canUpdate');
    }
    
    return allActions;
  };

  const toggleModule = (moduleKey: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleKey)) {
      newExpanded.delete(moduleKey);
    } else {
      newExpanded.add(moduleKey);
    }
    setExpandedModules(newExpanded);
  };

  const togglePermission = (moduleKey: string, action: keyof Permission) => {
    const newPermissions = { ...permissions };
    if (!newPermissions[moduleKey]) {
      newPermissions[moduleKey] = {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
      };
    }
    newPermissions[moduleKey] = {
      ...newPermissions[moduleKey],
      [action]: !newPermissions[moduleKey][action],
    };
    onChange(newPermissions);
  };

  const selectAll = (moduleKey: string) => {
    const newPermissions = { ...permissions };
    newPermissions[moduleKey] = {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    };
    onChange(newPermissions);
  };

  const deselectAll = (moduleKey: string) => {
    const newPermissions = { ...permissions };
    newPermissions[moduleKey] = {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    };
    onChange(newPermissions);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">Seleccionar acciones</h3>
        <button
          onClick={() => {
            const allPermissions: ModulePermissions = {};
            modulesToUse.forEach(key => {
              allPermissions[key.toLowerCase().replace(/\s/g, '')] = {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
              };
            });
            onChange(allPermissions);
          }}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Seleccionar todos
        </button>
      </div>

      <div className="space-y-3">
        {modulesToUse.map((moduleName) => {
          const key = moduleName.toLowerCase().replace(/\s/g, '');
          return (
            <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleModule(key)}
                className="w-full p-3 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium text-slate-700">{moduleName}</span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedModules.has(key) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedModules.has(key) && (
                <div className="p-4 bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-600">Acciones permitidas:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectAll(key)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Todo
                      </button>
                      <button
                        onClick={() => deselectAll(key)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {getAvailableActions(moduleName).map(action => (
                      <label
                        key={action}
                        className="flex items-center gap-2 p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={permissions[key]?.[action] || false}
                          onChange={() => togglePermission(key, action)}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700">{ACTION_LABELS[action]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
