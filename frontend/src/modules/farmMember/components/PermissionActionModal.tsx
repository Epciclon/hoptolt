'use client';

import { useState, useEffect } from 'react';
import { Dialog, Button } from '@/shared/ui';

interface PermissionActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (permissions: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }) => void;
  moduleName: string;
  isSensitive?: boolean;
  existingPermissions?: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean };
}

export function PermissionActionModal({ open, onClose, onConfirm, moduleName, isSensitive = false, existingPermissions }: PermissionActionModalProps) {
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  });

  // Cargar permisos existentes cuando se abre el modal
  useEffect(() => {
    if (open && existingPermissions) {
      setPermissions(existingPermissions);
    } else if (!open) {
      // Reset cuando se cierra
      setPermissions({
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
      });
    }
  }, [open, existingPermissions]);

  // Determinar qué acciones mostrar
  const getAvailableActions = () => {
    const allActions = ['canCreate', 'canRead', 'canUpdate', 'canDelete'] as const;
    
    // Módulos que solo soportan Crear y Consultar
    const twoActionsModules = ['Alimentación', 'Vacunación', 'Desparasitación', 'Limpieza', 'Mortalidad'];
    
    // Módulos que soportan Crear, Consultar y Eliminar (Desasignar)
    const threeActionsModules = ['Asignar'];
    
    if (twoActionsModules.includes(moduleName)) {
      return allActions.filter(action => action === 'canCreate' || action === 'canRead');
    }
    
    if (threeActionsModules.includes(moduleName)) {
      return allActions.filter(action => action !== 'canUpdate');
    }
    
    // El resto (Jaulas, Razas, Conejos, Genealogía, Reproducción) soporta las 4 acciones
    return allActions;
  };

  const handleToggle = (action: keyof typeof permissions) => {
    setPermissions({ ...permissions, [action]: !permissions[action] });
  };

  const handleToggleAll = () => {
    const availableActions = getAvailableActions();
    const allSelected = availableActions.every(action => permissions[action]);
    
    if (allSelected) {
      // Deseleccionar todo
      const newPermissions = { ...permissions };
      availableActions.forEach(action => {
        newPermissions[action] = false;
      });
      setPermissions(newPermissions);
    } else {
      // Seleccionar todo
      const newPermissions = { ...permissions };
      availableActions.forEach(action => {
        newPermissions[action] = true;
      });
      setPermissions(newPermissions);
    }
  };

  const handleConfirm = () => {
    onConfirm(permissions);
    onClose();
    // Reset permissions for next use
    setPermissions({
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    });
  };

  const handleClose = () => {
    onClose();
    // Reset permissions for next use
    setPermissions({
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} title={`Acciones para ${moduleName}`} size="md">
      <div className="space-y-4">
        {isSensitive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              Permisos para gestionar datos críticos del sistema. Solo asignar a trabajadores de confianza.
            </p>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-slate-600">Acciones permitidas:</span>
          <button
            onClick={handleToggleAll}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {getAvailableActions().every(action => permissions[action]) ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {getAvailableActions().map(action => (
            <label key={action} className="flex items-center gap-2 p-3 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={permissions[action]}
                onChange={() => handleToggle(action)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">
                {action === 'canCreate' ? 'Crear' : 
                 action === 'canRead' ? 'Consultar' : 
                 action === 'canUpdate' ? 'Editar' : 'Eliminar'}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
