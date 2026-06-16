'use client';

import { Sidebar } from '@/shared/layout/Sidebar';
import { Header } from '@/shared/layout/Header';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ToastProvider } from '@/shared/contexts/ToastContext';
import { ToastContainer } from '@/shared/ui/ToastContainer';
import { usePathname } from 'next/navigation';
import { PermissionGuard } from '@/shared/guards/PermissionGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.replace('/login');
    }
  }, [user, loading, router, mounted]);

  // Verificación adicional para prevenir acceso tras logout
  useEffect(() => {
    if (!mounted) return;
    
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && !loading) {
        router.replace('/login');
      }
    };
    
    checkAuth();
  }, [loading, router, mounted]);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Don't render dashboard while redirecting
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-page">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-60">
          <Header />
          <main className="flex-1 p-6">
            <PermissionGuard>
              {children}
            </PermissionGuard>
          </main>
        </div>
        <ToastContainer />
      </div>
    </ToastProvider>
  );
}

