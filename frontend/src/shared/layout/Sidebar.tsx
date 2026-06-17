'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Box, Dna, Rabbit, Network, ArrowLeftRight,
  Utensils, Syringe, Pill, TrendingUp, Sparkles, Skull,
  Heart, Users, FileText, BookOpen, Building2, ChevronDown,
  LogOut, User, Menu, X, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface NavChild {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  { name: 'Inicio', href: '/dashboard', icon: Home },
  {
    name: 'Gestionar Crianza',
    icon: Rabbit,
    children: [
      { name: 'Jaulas', href: '/dashboard/cages' },
      { name: 'Razas', href: '/dashboard/races' },
      { name: 'Conejos', href: '/dashboard/rabbits' },
      { name: 'Árbol Genealógico', href: '/dashboard/genealogy' },
      { name: 'Asignar Jaula', href: '/dashboard/assignments' },
      { name: 'Alimentación', href: '/dashboard/feeding' },
      { name: 'Vacunación', href: '/dashboard/vaccination' },
      { name: 'Desparasitación', href: '/dashboard/deworming' },
      { name: 'Limpieza', href: '/dashboard/cleaning' },
      { name: 'Mortalidad', href: '/dashboard/mortality' },
      { name: 'Reproducción y Parto', href: '/dashboard/reproduction' },
    ],
  },
  {
    name: 'Usuarios',
    icon: Users,
    children: [
      { name: 'Equipo de Trabajo', href: '/dashboard/users' },
    ],
  },
  {
    name: 'Reportes',
    icon: FileText,
    children: [
      { name: 'Reporte Alimentación', href: '/dashboard/reports/feeding' },
      { name: 'Reporte Vacunación', href: '/dashboard/reports/vaccination' },
      { name: 'Reporte Desparasitación', href: '/dashboard/reports/deworming' },
    ],
  },
  { name: 'Guía de Saberes', href: '/dashboard/knowledge', icon: BookOpen },
  { name: 'Galpones', href: '/dashboard/galpones', icon: Building2 },
];

const childIcons: Record<string, React.ElementType> = {
  Jaulas: Box, Razas: Dna, Conejos: Rabbit,
  'Árbol Genealógico': Network, 'Asignar Jaula': ArrowLeftRight,
  Alimentación: Utensils, Vacunación: Syringe, Desparasitación: Pill,
  Limpieza: Sparkles, Mortalidad: Skull,
  'Reproducción y Parto': Heart, 'Gestionar Usuarios': User,
  'Reporte Alimentación': FileText, 'Reporte Vacunación': FileText, 'Reporte Desparasitación': FileText,
};

// Mapeo de nombres de menú a nombres de módulos de permisos
const menuToPermissionMap: Record<string, string> = {
  'Jaulas': 'cages',
  'Razas': 'races',
  'Conejos': 'rabbits',
  'Árbol Genealógico': 'genealogy',
  'Asignar Jaula': 'assignments',
  'Alimentación': 'feeding',
  'Vacunación': 'vaccination',
  'Desparasitación': 'deworming',
  'Limpieza': 'cleaning',
  'Mortalidad': 'mortality',
  'Reproducción y Parto': 'reproduction',
  'Equipo de Trabajo': 'farmMembers',
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(['Gestionar Crianza']);
  const { hasPermission, role, loading } = usePermissions();

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name],
    );
  };

  const isActive = (href: string) => {
    // /dashboard (Inicio) must be an exact match so it doesn't highlight on sub-pages
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Filtrar items del menú según permisos
  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // Si es owner, mostrar todo
      if (role === 'owner') return true;

      // Items que siempre se muestran
      if (item.name === 'Inicio' || item.name === 'Galpones' || item.name === 'Guía de Saberes') {
        return true;
      }

      // Si tiene hijos, filtrar los hijos
      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          const permissionModule = menuToPermissionMap[child.name];
          // Si no tiene mapeo, mostrar por defecto (para items nuevos)
          if (!permissionModule) return true;
          return hasPermission(permissionModule);
        });

        // Si al menos un hijo tiene permiso, mostrar el padre
        return filteredChildren.length > 0;
      }

      // Items individuales que requieren permiso
      const permissionModule = menuToPermissionMap[item.name];
      if (!permissionModule) return true;
      return hasPermission(permissionModule);
    }).map(item => {
      // Si tiene hijos, filtrarlos también
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => {
            const permissionModule = menuToPermissionMap[child.name];
            if (!permissionModule) return true;
            return hasPermission(permissionModule);
          })
        };
      }
      return item;
    });
  };

  const filteredNavigation = loading ? navigation : filterNavigation(navigation);

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full w-60 bg-sidebar flex flex-col z-40 overflow-hidden transition-all duration-300",
      collapsed ? "-translate-x-full" : "translate-x-0"
    )}>
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-primary-400 font-bold text-base tracking-widest uppercase">
            Hoptolt
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Sistema de gestión de crianza</p>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title="Ocultar menú"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            return (
              <Link
                key={item.name}
                href={item.href!}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all',
                  isActive(item.href!)
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon size={18} className="shrink-0" />
                {item.name}
              </Link>
            );
          }

          const isOpen = openGroups.includes(item.name);
          const hasActiveChild = item.children.some((c) => isActive(c.href));

          return (
            <div key={item.name} className="mb-1">
              <button
                onClick={() => toggleGroup(item.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  hasActiveChild
                    ? 'text-primary-400 bg-white/5'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className="flex-1 text-left">{item.name}</span>
                <ChevronDown
                  size={15}
                  className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <div className="ml-6 mt-1 flex flex-col gap-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = childIcons[child.name];
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all',
                          isActive(child.href)
                            ? 'bg-primary-500/20 text-primary-300 border-l-2 border-primary-400'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                        )}
                      >
                        {ChildIcon && <ChildIcon size={15} className="shrink-0" />}
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
