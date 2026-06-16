'use client';

import { AuthProvider } from '@/modules/auth/contexts/AuthContext';

/**
 * Wrapper de cliente que encapsula todos los providers que requieren
 * hooks de React (useContext, useRouter, etc.) para que puedan ser
 * importados desde el Server Component RootLayout sin errores de SSR.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
