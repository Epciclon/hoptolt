export interface WorkerPermission {
  moduleName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// Profile almacenado localmente en nuestra BD (sincronizado desde Supabase Auth)
export interface Profile {
  id: string;           // UUID de Supabase Auth
  username: string;
  email: string;
  fullName: string;
  activeGalponId: number | null;
  createdAt: string;
  role?: 'owner' | 'worker' | null;
  permissions?: WorkerPermission[];
}

// Datos para el formulario de registro
export interface RegisterDto {
  username: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

// Datos para el formulario de login (puede ser email o username)
export interface LoginDto {
  identifier: string; // email o username
  password: string;
}

// Respuesta del backend al sincronizar el perfil
export interface SyncProfileResponse {
  success: boolean;
  message?: string;
  user: Profile;
}
