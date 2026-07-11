'use client';

import React, { useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { authService } from '@/modules/auth/services/auth.service';
import { useToast } from '@/shared/contexts/ToastContext';
import { Card, Button, Input } from '@/shared/ui';
import { User, Lock, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Por favor completa todos los campos de contraseña', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_]/.test(newPassword)) {
      showToast('La nueva contraseña debe contener al menos un carácter especial (ej. @#$%)', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('La nueva contraseña y su confirmación no coinciden', 'error');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-slate-500 mt-1">Administra tus datos personales, seguridad de la cuenta y preferencias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Tabs */}
        <Card className="md:col-span-1" padding="sm">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('personal')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                activeTab === 'personal'
                  ? "bg-primary-50 text-primary-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <User size={18} />
              Datos Personales
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                activeTab === 'password'
                  ? "bg-primary-50 text-primary-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Lock size={18} />
              Seguridad
            </button>
            <button
              onClick={() => setActiveTab('delete')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                activeTab === 'delete'
                  ? "bg-red-50 text-red-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-red-600"
              )}
            >
              <Trash2 size={18} />
              Eliminar Cuenta
            </button>
          </nav>
        </Card>

        {/* Tab Content Area */}
        <div className="md:col-span-3">
          {activeTab === 'personal' && (
            <Card>
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
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

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button type="submit" disabled={updatingProfile}>
                    {updatingProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card>
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Lock className="text-primary-500" size={20} />
                Cambio de Contraseña
              </h3>

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    label="Contraseña Actual"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingrese su contraseña actual"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    label="Nueva Contraseña"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirmar Nueva Contraseña"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button type="submit" disabled={updatingPassword}>
                    {updatingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'delete' && (
            <Card>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Trash2 className="text-slate-500" size={20} />
                Eliminar Cuenta
              </h3>

              <p className="text-sm text-slate-500 mb-3">Al eliminar tu cuenta se realizarán las siguientes acciones:</p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1.5 mb-8">
                <li>Se eliminará tu perfil y tus credenciales de acceso.</li>
                <li>Se eliminarán todos tus galpones, jaulas y conejos.</li>
                <li>Se eliminarán los registros sanitarios, reproducciones y alimentación.</li>
                <li>Se revocarán los accesos de trabajadores en tus galpones.</li>
                <li>Serás removido de cualquier galpón donde estés registrado como trabajador.</li>
              </ul>

              <div className="border-t border-slate-100 pt-6 flex justify-center">
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeletePassword('');
                    setShowDeletePassword(false);
                    setShowDeleteModal(true);
                  }}
                >
                  Eliminar mi cuenta
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-red-500 shrink-0" size={22} />
                Confirmar eliminación
              </h3>
              <p className="text-sm text-slate-600 mt-3">
                Para confirmar la eliminación física de tu cuenta y de toda tu información, introduce tu contraseña actual a continuación:
              </p>

              <div className="relative mt-4">
                <Input
                  type={showDeletePassword ? 'text' : 'password'}
                  required
                  label="Contraseña Actual"
                  placeholder="Introduce tu contraseña actual"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
              >
                {deleting ? 'Eliminando Cuenta...' : 'Sí, eliminar definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
