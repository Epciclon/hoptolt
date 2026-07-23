'use client';

import { AuthProvider } from '@/modules/auth/contexts/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ToastProvider } from '@/shared/contexts/ToastContext';
import { ToastContainer } from '@/shared/ui/ToastContainer';

import { useThemeSync } from '@/hooks/useThemeSync';

function RealtimeSyncHelper() {
  useRealtimeSync();
  useThemeSync();
  return null;
}

/**
 * Wrapper de cliente que encapsula todos los providers que requieren
 * hooks de React (useContext, useRouter, etc.) para que puedan ser
 * importados desde el Server Component RootLayout sin errores de SSR.
 */
export default function ClientProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ToastProvider>
      <QueryProvider>
        <AuthProvider>
          <RealtimeSyncHelper />
          {children}
          <ToastContainer />
        </AuthProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
