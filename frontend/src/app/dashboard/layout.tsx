'use client';

import { Sidebar } from '@/shared/layout/Sidebar';
import { Header } from '@/shared/layout/Header';
import { List } from 'lucide-react';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';


import { PermissionGuard } from '@/shared/guards/PermissionGuard';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

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
      // E2E Bypass en cliente
      if (process.env.NODE_ENV !== 'production' && document.cookie.includes('e2e_bypass=true')) {
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !loading) {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [loading, router, mounted]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (mounted) {
      const isMobile = window.innerWidth < 1024;
      setSidebarCollapsed(isMobile);
    }
  }, [mounted]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      
      // If we are opening the sidebar on mobile, close notifications
      if (!next && window.innerWidth < 1024) {
        window.dispatchEvent(new CustomEvent('close-notifications'));
      }
      
      return next;
    });
  };

  useEffect(() => {
    const handleCloseSidebar = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
        localStorage.setItem('sidebarCollapsed', 'true');
      }
    };
    window.addEventListener('close-sidebar', handleCloseSidebar);
    return () => window.removeEventListener('close-sidebar', handleCloseSidebar);
  }, []);

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
    <div className="flex min-h-screen bg-page relative overflow-x-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        
        {/* Floating trigger tab visible on both mobile and PC when sidebar is closed */}
        {sidebarCollapsed && (
          <button type="button"
            onClick={toggleSidebar}
            className="fixed left-0 top-24 z-50 bg-sidebar hover:bg-slate-800 text-white rounded-r-full pl-3 pr-4 py-3 shadow-lg border border-l-0 border-white/10 transition-all duration-300 flex items-center justify-center group"
            title="Mostrar menú"
          >
            <List size={20} className="text-primary-400 group-hover:text-white transition-colors" />
          </button>
        )}

        {/* Overlay / Backdrop on mobile when sidebar is open */}
        {!sidebarCollapsed && (
          <button 
            type="button"
            onClick={toggleSidebar} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSidebar(); }}
            aria-label="Cerrar menú lateral"
            className="fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity duration-300 w-full h-full border-none cursor-pointer outline-none"
          />
        )}
        
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-60'}`}>
          <Header />
          <main className="flex-1 p-4 md:p-6 max-w-full min-w-0 overflow-x-hidden">
            <PermissionGuard>
              {children}
            </PermissionGuard>
          </main>
        </div>
      </div>
  );
}
