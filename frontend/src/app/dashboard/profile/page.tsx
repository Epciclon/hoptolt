'use client';

import React, { useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { authService } from '@/modules/auth/services/auth.service';
import { useToast } from '@/shared/contexts/ToastContext';
import { Card, Button, Input, Dialog } from '@/shared/ui';
import { User, Lock, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function validatePasswordChange(current: string, newPass: string, confirm: string): string | null {
  if (!current || !newPass || !confirm) {
    return 'Por favor completa todos los campos de contraseña';
  }
  if (newPass.length < 6) {
    return 'La nueva contraseña debe tener al menos 6 caracteres';
  }
  if (!/\d/.test(newPass)) {
    return 'La nueva contraseña debe contener al menos un número';
  }
  if (!/[!@#$%^&*(),.?":{}|<>_]/.test(newPass)) {
    return 'La nueva contraseña debe contener al menos un carácter especial como @#$%';
  }
  if (newPass !== confirm) {
    return 'La nueva contraseña y su confirmación no coinciden';
  }
  return null;
}

export default function ProfilePage() {
  const { user, refetchUser, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'personal' | 'password' | 'delete'>('personal');

  // Datos Personales Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Cambio de Contraseña Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Eliminar Cuenta Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handlers
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      showToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    setUpdatingProfile(true);
    try {
      await authService.updateProfile(fullName.trim(), username.trim());
      await refetchUser();
      showToast('Perfil actualizado correctamente', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar el perfil', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authService.updatePassword(currentPassword, newPassword);
      showToast('Contraseña actualizada. Por seguridad, se cerrará tu sesión...', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Cerrar sesión por seguridad para que el usuario ingrese con la nueva contraseña
      setTimeout(async () => {
        await logout();
      }, 2000);
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar la contraseña', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast('Debe ingresar su contraseña para confirmar la acción', 'error');
      return;
    }

    setDeleting(true);
    try {
      await authService.deleteAccount(deletePassword);
      showToast('Cuenta eliminada permanentemente. Cerrando sesión...', 'success');
      // Esperar brevemente antes de redirigir
      setTimeout(async () => {
        await logout();
      }, 1500);
    } catch (error: any) {
      showToast(error.message || 'Error al eliminar la cuenta. Verifica tu contraseña.', 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800/50 overflow-hidden" padding="none">
        <div className="p-4 sm:p-6 md:p-8 border-b border-default bg-card">
          <h1 className="text-2xl font-bold text-main">Tu Cuenta</h1>
          <p className="text-muted mt-1">Cambia tu contraseña, asegura tu perfil y ajusta tus preferencias personales</p>
        </div>

        <div className="flex flex-col md:flex-row bg-card min-h-[calc(100vh-12rem)]">
          {/* Navigation Tabs */}
          <div className="w-full md:w-64 shrink-0 p-4 md:p-6 md:border-r border-default bg-card">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <button type="button"
              onClick={() => setActiveTab('personal')}
              className={cn(
                "flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0",
                activeTab === 'personal'
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "text-muted hover:bg-theme-surface dark:hover:bg-slate-800/50 hover:text-main"
              )}
            >
              <User size={18} />
              Datos Personales
            </button>
            <button type="button"
              onClick={() => setActiveTab('password')}
              className={cn(
                "flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0",
                activeTab === 'password'
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "text-muted hover:bg-theme-surface dark:hover:bg-slate-800/50 hover:text-main"
              )}
            >
              <Lock size={18} />
              Seguridad
            </button>
            <button type="button"
              onClick={() => setActiveTab('delete')}
              className={cn(
                "flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0",
                activeTab === 'delete'
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "text-muted hover:bg-theme-surface dark:hover:bg-slate-800/50 hover:text-red-600 dark:hover:text-red-400"
              )}
            >
              <Trash2 size={18} />
              Eliminar Cuenta
            </button>
          </nav>
        </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 pb-24 sm:pb-8 bg-card">
            {activeTab === 'personal' && (
              <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
                <User className="text-primary-500" size={20} />
                Datos Personales
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <Input
                  label="Nombre Completo"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                />

                <Input
                  label="Nombre de Usuario"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu nombre de usuario"
                  hint="Debe ser único y sin espacios"
                />

                <Input
                  label="Correo Electrónico"
                  value={user?.email || ''}
                  disabled
                  placeholder="Tu correo electrónico"
                  hint="El correo electrónico no puede ser modificado"
                />

                <div className="pt-4 border-t border-default flex flex-col sm:flex-row sm:justify-end">
                  <Button type="submit" disabled={updatingProfile} className="w-full sm:w-auto">
                    {updatingProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
                <Lock className="text-primary-500" size={20} />
                Cambio de Contraseña
              </h3>

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Contraseña Actual"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="text-theme-faint hover:text-muted focus:outline-none p-1 transition-colors flex items-center justify-center cursor-pointer"
                      aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  label="Nueva Contraseña"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres, 1 número y 1 símbolo"
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-theme-faint hover:text-muted focus:outline-none p-1 transition-colors flex items-center justify-center cursor-pointer"
                      aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmar Nueva Contraseña"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-theme-faint hover:text-muted focus:outline-none p-1 transition-colors flex items-center justify-center cursor-pointer"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <div className="pt-4 border-t border-default flex flex-col sm:flex-row sm:justify-end">
                  <Button type="submit" disabled={updatingPassword} className="w-full sm:w-auto">
                    {updatingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-main mb-4 flex items-center gap-2">
                <Trash2 className="text-muted" size={20} />
                Eliminar Cuenta
              </h3>

              <p className="text-sm text-muted mb-3">Al eliminar tu cuenta se realizarán las siguientes acciones:</p>
              <ul className="text-sm text-muted list-disc pl-5 space-y-1.5 mb-8">
                <li>Se eliminará tu perfil y tus credenciales de acceso.</li>
                <li>Se eliminarán todos tus galpones, jaulas y conejos.</li>
                <li>Se eliminarán los registros sanitarios, reproducciones y alimentación.</li>
                <li>Se revocarán los accesos de trabajadores en tus galpones.</li>
                <li>Serás removido de cualquier galpón donde estés registrado como trabajador.</li>
              </ul>

              <div className="border-t border-default pt-6 flex justify-center sm:justify-start">
                <Button
                  variant="danger"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setDeletePassword('');
                    setShowDeletePassword(false);
                    setShowDeleteModal(true);
                  }}
                >
                  Eliminar mi cuenta
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>

    {/* Confirmation Modal */}
    <Dialog
      open={showDeleteModal}
      onClose={() => {
        if (!deleting) {
          setShowDeleteModal(false);
          setDeletePassword('');
        }
      }}
      title="Confirmar eliminación"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400">
          <AlertTriangle className="shrink-0 mt-0.5 text-red-500" size={20} />
          <p className="text-xs sm:text-sm font-medium">
            Esta acción es irreversible y eliminará todos tus datos permanentemente.
          </p>
        </div>

        <p className="text-xs sm:text-sm text-muted">
          Para confirmar la eliminación física de tu cuenta y de toda tu información, introduce tu contraseña actual a continuación:
        </p>

        <Input
          type={showDeletePassword ? 'text' : 'password'}
          required
          label="Contraseña Actual"
          placeholder="Introduce tu contraseña actual"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowDeletePassword(!showDeletePassword)}
              className="text-theme-faint hover:text-muted focus:outline-none p-1 transition-colors flex items-center justify-center cursor-pointer"
              aria-label={showDeletePassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <div className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword('');
            }}
            disabled={deleting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleting || !deletePassword}
            className="w-full sm:w-auto"
          >
            {deleting ? 'Eliminando Cuenta...' : 'Sí, eliminar definitivamente'}
          </Button>
        </div>
      </div>
    </Dialog>
    </div>
  );
}
