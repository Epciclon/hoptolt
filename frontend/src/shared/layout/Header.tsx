'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { NotificationIcon } from '@/modules/notification/components/NotificationIcon';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const savedSize = localStorage.getItem('fontSize') ?? '16px';
    const savedFont = localStorage.getItem('fontFamily') ?? '';
    document.documentElement.style.fontSize = savedSize;
    if (savedFont) document.documentElement.style.fontFamily = savedFont;
  }, []);

  const handleLogout = async () => {
    Cookies.remove('auth_token');
    await logout();
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <NotificationIcon />
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors',
              dropdownOpen ? 'bg-slate-100' : 'hover:bg-slate-50',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm uppercase">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-none">{user?.fullName || 'Usuario'}</p>
              <p className="text-xs text-slate-400 mt-0.5">@{user?.username || 'usuario'}</p>
            </div>
            <ChevronDown
              size={14}
              className={cn('text-slate-400 transition-transform', dropdownOpen && 'rotate-180')}
            />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">{user?.fullName || 'Usuario'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'usuario@ejemplo.com'}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                  >
                    <User size={16} /> Mi Perfil
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                  >
                    <Settings size={16} /> Apariencia del Sistema
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
