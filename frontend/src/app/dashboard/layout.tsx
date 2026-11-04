'use client';

import { Sidebar } from '@/shared/layout/Sidebar';
import { Header } from '@/shared/layout/Header';
import { List } from 'lucide-react';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';


import { PermissionGuard } from '@/shared/guards/PermissionGuard';
import { IncidentFloatingWidget } from '@/modules/incident/components/IncidentFloatingWidget';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Si la URL actual contiene parámetros de recuperación, NUNCA permitir ver el dashboard
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (
        search.includes('type=recovery') ||
        search.includes('token_hash=') ||
        hash.includes('type=recovery') ||
        hash.includes('access_token=')
      ) {
        window.location.replace(`/reset-password${search}${hash}`);
        return;
      }
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.replace('/login');
    }
  }, [user, loading, router, mounted]);

  // Verificación adicional para prevenir acceso tras logout o con sesiones de recuperación
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
        return;
      }

      // Si la sesión proviene de recuperación de contraseña, expulsar inmediatamente a /reset-password
      if (session?.access_token) {
        try {
          const parts = session.access_token.split('.');
          if (parts.length >= 2) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            const isRecovery = Array.isArray(payload.amr) && payload.amr.some((item: { method?: string }) => item.method === 'recovery');
            if (isRecovery) {
              window.location.replace('/reset-password');
              return;
            }
          }
        } catch {
          // Ignorar error al parsear payload
        }
      }
    };

    checkAuth();
  }, [loading, router, mounted]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (mounted) {
      const isMobile = window.innerWidth < 1280;
      setSidebarCollapsed(isMobile);
    }
  }, [mounted]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebarCollapsed', String(next));
    
    // If we are opening the sidebar on mobile or tablet, close notifications
    if (!next && window.innerWidth < 1280) {
      window.dispatchEvent(new CustomEvent('close-notifications'));
    }
  };

  useEffect(() => {
    const handleCloseSidebar = () => {
      if (window.innerWidth < 1280) {
        setTimeout(() => {
          setSidebarCollapsed(true);
          localStorage.setItem('sidebarCollapsed', 'true');
        }, 0);
      }
    };
    const handleToggleEvent = () => toggleSidebar();
    window.addEventListener('close-sidebar', handleCloseSidebar);
    window.addEventListener('toggle-sidebar', handleToggleEvent);
    return () => {
      window.removeEventListener('close-sidebar', handleCloseSidebar);
      window.removeEventListener('toggle-sidebar', handleToggleEvent);
    };
  }, [sidebarCollapsed]);

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
    <div className="flex min-h-screen bg-page relative overflow-x-clip">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        
        {/* Floating trigger tab visible only on desktop when sidebar is closed */}
        {sidebarCollapsed && (
          <button type="button"
            onClick={toggleSidebar}
            className="hidden xl:flex fixed left-0 top-24 z-50 bg-sidebar hover:bg-slate-800 text-white rounded-r-full pl-3 pr-4 py-3 shadow-lg border border-l-0 border-white/10 transition-all duration-300 items-center justify-center group"
            title="Mostrar menú"
          >
            <List size={20} className="text-primary-400 group-hover:text-white transition-colors" />
          </button>
        )}

        {/* Overlay / Backdrop on mobile and tablets when sidebar is open */}
        {!sidebarCollapsed && (
          <button 
            type="button"
            onClick={toggleSidebar} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSidebar(); }}
            aria-label="Cerrar menú lateral"
            className="fixed inset-0 bg-black/50 z-40 xl:hidden transition-opacity duration-300 w-full h-full border-none cursor-pointer outline-none"
          />
        )}
        
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${sidebarCollapsed ? 'xl:ml-0' : 'xl:ml-60'}`}>
          <Header />
          <main className="flex-1 p-2.5 sm:p-4 md:p-6 pb-28 sm:pb-24 max-w-full min-w-0 overflow-x-hidden">
            <PermissionGuard>
              {children}
            </PermissionGuard>
          </main>
        </div>

        {/* Global floating incident report widget: oculto en móvil cuando el menú lateral está abierto para evitar solapamientos */}
        <div className={!sidebarCollapsed ? 'hidden xl:block' : ''}>
          <IncidentFloatingWidget />
        </div>
      </div>
  );
}

