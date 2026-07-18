'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { Type, Bold, Moon, Contrast, ALargeSmall } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Datos de opciones ────────────────────────────────────────────────────────

const FONT_SIZES = [
  { key: '14px', label: 'Pequeña'      },
  { key: '16px', label: 'Normal'       },
  { key: '18px', label: 'Grande'       },
  { key: '20px', label: 'Muy grande'   },
  { key: '22px', label: 'Extra grande' },
  { key: '24px', label: 'Máxima'       },
];

const FONT_FAMILIES = [
  { key: '',                              label: 'Segoe UI (predeterminado)', description: 'Fuente del sistema — moderna y clara' },
  { key: "'Calibri', sans-serif",          label: 'Calibri',                   description: 'Moderna y optimizada para pantalla — ideal para leer' },
  { key: "'Georgia', serif",              label: 'Georgia',                   description: 'Clásica con serifas — cómoda en textos largos' },
  { key: "'Arial', sans-serif",           label: 'Arial',                     description: 'Familiar y ampliamente usada' },
  { key: "'Verdana', sans-serif",         label: 'Verdana',                   description: 'Diseñada para pantalla — letras bien separadas' },
  { key: "'Trebuchet MS', sans-serif",    label: 'Trebuchet MS',              description: 'Moderna y de alta legibilidad' },
  { key: "'Courier New', monospace",      label: 'Courier New',               description: 'Monoespaciada — para quienes prefieren claridad total' },
];

import { applyThemeToDOM as applyToDOM } from '@/hooks/useThemeSync';

// ── Tipos de sección ──────────────────────────────────────────────────────────

type Section = 'size' | 'family' | 'bold' | 'dark' | 'contrast';

interface NavItem {
  readonly id: Section;
  readonly label: string;
  readonly icon: React.ElementType;
  readonly ready: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'size',     label: 'Tamaño de Letra',   icon: ALargeSmall, ready: true  },
  { id: 'family',   label: 'Tipo de Letra',      icon: Type,        ready: true  },
  { id: 'bold',     label: 'Texto en Negrilla',  icon: Bold,        ready: true  },
  { id: 'dark',     label: 'Modo Oscuro',         icon: Moon,        ready: true },
  { id: 'contrast', label: 'Alto Contraste',      icon: Contrast,    ready: true },
];

// ── Componente check ─────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState<Section>('size');
  const [fontSize,   setFontSize]   = useState('16px');
  const [fontFamily, setFontFamily] = useState('');
  const [bold,       setBold]       = useState(false);
  const [theme,      setTheme]      = useState<'light' | 'dark' | 'contrast'>('light');

  useEffect(() => {
    const size   = localStorage.getItem('fontSize')   ?? '16px';
    const family = localStorage.getItem('fontFamily') ?? '';
    const bld    = localStorage.getItem('fontBold')   === 'true';
    const thm    = (localStorage.getItem('theme') as any) ?? 'light';
    setFontSize(size);
    setFontFamily(family);
    setBold(bld);
    setTheme(thm);
    applyToDOM(size, family, bld, thm);
  }, []);

  const selectSize = useCallback((key: string) => {
    setFontSize(key);
    applyToDOM(key, fontFamily, bold, theme);
    localStorage.setItem('fontSize', key);
    showToast('Tamaño de letra actualizado', 'success');
  }, [fontFamily, bold, theme, showToast]);

  const selectFamily = useCallback((key: string) => {
    setFontFamily(key);
    applyToDOM(fontSize, key, bold, theme);
    if (key) localStorage.setItem('fontFamily', key);
    else localStorage.removeItem('fontFamily');
    showToast('Tipo de letra actualizado', 'success');
  }, [fontSize, bold, theme, showToast]);

  const toggleBold = useCallback((opt: boolean) => {
    setBold(opt);
    applyToDOM(fontSize, fontFamily, opt, theme);
    localStorage.setItem('fontBold', String(opt));
    showToast(opt ? 'Negrilla activada' : 'Negrilla desactivada', 'success');
  }, [fontSize, fontFamily, theme, showToast]);

  const selectTheme = useCallback((thm: 'light' | 'dark' | 'contrast') => {
    setTheme(thm);
    applyToDOM(fontSize, fontFamily, bold, thm);
    localStorage.setItem('theme', thm);
    
    let msg = 'Modo normal activado';
    if (thm === 'dark') msg = 'Modo oscuro activado';
    else if (thm === 'contrast') msg = 'Alto contraste activado';
    showToast(msg, 'success');
  }, [fontSize, fontFamily, bold, theme, showToast]);

  const resetDefaults = () => {
    setFontSize('16px');
    setFontFamily('');
    setBold(false);
    setTheme('light');
    applyToDOM('16px', '', false, 'light');
    localStorage.setItem('fontSize', '16px');
    localStorage.removeItem('fontFamily');
    localStorage.removeItem('fontBold');
    localStorage.removeItem('theme');
    showToast('Preferencias restablecidas', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden" padding="none">
        <div className="p-6 md:p-8 border-b border-default bg-card">
          <h1 className="text-2xl font-bold text-main">Apariencia</h1>
          <p className="text-muted mt-1">Ajusta los colores y el tamaño de letra a tu gusto para no cansarte la vista</p>
        </div>

        <div className="flex flex-col md:flex-row bg-card min-h-[calc(100vh-12rem)]">
          {/* Navigation Tabs */}
          <div className="w-full md:w-64 shrink-0 p-4 md:p-6 md:border-r border-default bg-card">
            <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {NAV_ITEMS.map(({ id, label, icon: Icon, ready }) => (
                <button
                  key={id}
                  onClick={() => ready && setActiveSection(id)}
                  disabled={!ready}
                  className={cn(
                    "flex items-center justify-center md:justify-between gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 w-auto md:w-full",
                    !ready && "opacity-50 cursor-not-allowed",
                    ready && activeSection === id
                      ? "bg-primary-50 text-primary-600"
                      : (ready ? "text-muted hover:bg-theme-surface hover:text-main" : "text-theme-faint")
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    {label}
                  </span>
                  {!ready && (
                    <span className="text-[10px] bg-theme-surface border border-default text-muted px-1.5 py-0.5 rounded-full font-normal">
                      Pronto
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8 bg-card flex flex-col gap-4">
          {/* ── Tamaño de Letra ── */}
          {activeSection === 'size' && (
            <Card>
              <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                <ALargeSmall className="text-primary-500" size={20} />
                Tamaño de Letra
              </h3>
              <p className="text-sm text-muted mb-6">El cambio se aplica de inmediato en toda la aplicación.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {FONT_SIZES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => selectSize(f.key)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                      fontSize === f.key
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-strong bg-card hover:border-primary-300 hover:bg-theme-surface',
                    )}
                  >
                    {fontSize === f.key && (
                      <span className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                        <CheckIcon />
                      </span>
                    )}
                    <span style={{ fontSize: f.key }} className="font-semibold text-main leading-none">
                      Aa
                    </span>
                    <span className="text-xs text-muted leading-tight">{f.label}</span>
                    <span className="text-[11px] text-theme-faint">{f.key}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-theme-surface rounded-xl border border-default">
                <p className="text-muted text-xs mb-1">Vista previa con el tamaño actual:</p>
                <p style={{ fontSize }} className="text-main font-medium">
                  Hoptolt — Sistema de gestión de crianza de conejos
                </p>
              </div>

              <SaveBar onReset={resetDefaults} />
            </Card>
          )}

          {/* ── Tipo de Letra ── */}
          {activeSection === 'family' && (
            <Card>
              <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                <Type className="text-primary-500" size={20} />
                Tipo de Letra
              </h3>
              <p className="text-sm text-muted mb-6">Elige la fuente que te resulte más cómoda de leer.</p>

              <div className="flex flex-col gap-3">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => selectFamily(f.key)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      fontFamily === f.key
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-strong bg-card hover:border-primary-300 hover:bg-theme-surface',
                    )}
                  >
                    <span className={cn(
                      'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      fontFamily === f.key ? 'border-primary-500 bg-primary-500' : 'border-slate-300',
                    )}>
                      {fontFamily === f.key && <CheckIcon />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-main" style={{ fontFamily: f.key || undefined }}>
                        {f.label}
                      </p>
                      <p className="text-xs text-theme-faint mt-0.5">{f.description}</p>
                      <p
                        className="text-sm text-muted mt-2 pt-2 border-t border-default"
                        style={{ fontFamily: f.key || undefined, fontSize }}
                      >
                        Hoptolt — Sistema de gestión de crianza
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <SaveBar onReset={resetDefaults} />
            </Card>
          )}

          {/* ── Texto en Negrilla ── */}
          {activeSection === 'bold' && (
            <Card>
              <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                <Bold className="text-primary-500" size={20} />
                Texto en Negrilla
              </h3>
              <p className="text-sm text-muted mb-6">
                Aumenta el peso del texto para mejorar la legibilidad, especialmente útil en tamaños de letra grandes.
              </p>

              <div className="flex flex-col gap-3">
                {[
                  { value: false, label: 'Normal', description: 'Peso estándar del texto — predeterminado' },
                  { value: true,  label: 'Negrilla', description: 'Texto más grueso — mayor legibilidad' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => toggleBold(opt.value)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      bold === opt.value
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-strong bg-card hover:border-primary-300 hover:bg-theme-surface',
                    )}
                  >
                    <span className={cn(
                      'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      bold === opt.value ? 'border-primary-500 bg-primary-500' : 'border-slate-300',
                    )}>
                      {bold === opt.value && <CheckIcon />}
                    </span>
                    <div>
                      <p
                        className="text-main"
                        style={{ fontWeight: opt.value ? 700 : 400, fontSize }}
                      >
                        {opt.label} — Hoptolt Sistema de Crianza
                      </p>
                      <p className="text-xs text-theme-faint mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <SaveBar onReset={resetDefaults} />
            </Card>
          )}

            {/* ── Modo Oscuro ── */}
            {activeSection === 'dark' && (
              <div className="max-w-3xl mx-auto w-full">
                <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                  <Moon className="text-primary-500" size={20} />
                  Modo Oscuro
                </h3>
                <p className="text-sm text-muted mb-6">
                  Cambia la interfaz a colores oscuros para reducir la fatiga visual.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => { if (theme === 'dark') selectTheme('light'); }} className={cn("p-4 border-2 rounded-xl flex-1 text-center font-medium", theme !== 'dark' ? 'border-primary-500 bg-theme-surface text-primary-600' : 'border-default text-muted')}>
                    Desactivado
                  </button>
                  <button onClick={() => selectTheme('dark')} className={cn("p-4 border-2 rounded-xl flex-1 text-center font-medium", theme === 'dark' ? 'border-primary-500 bg-theme-surface text-primary-600' : 'border-default text-muted')}>
                    Activado
                  </button>
                </div>
                <SaveBar onReset={resetDefaults} />
              </div>
            )}

            {/* ── Alto Contraste ── */}
            {activeSection === 'contrast' && (
              <div className="max-w-3xl mx-auto w-full">
                <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                  <Contrast className="text-primary-500" size={20} />
                  Alto Contraste
                </h3>
                <p className="text-sm text-muted mb-6">
                  Usa colores intensos (blanco, negro, amarillo) para máxima legibilidad.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => { if (theme === 'contrast') selectTheme('light'); }} className={cn("p-4 border-2 rounded-xl flex-1 text-center font-medium", theme !== 'contrast' ? 'border-primary-500 bg-theme-surface text-primary-600' : 'border-default text-muted')}>
                    Desactivado
                  </button>
                  <button onClick={() => selectTheme('contrast')} className={cn("p-4 border-2 rounded-xl flex-1 text-center font-medium", theme === 'contrast' ? 'border-primary-500 bg-theme-surface text-primary-600' : 'border-default text-muted')}>
                    Activado
                  </button>
                </div>
                <SaveBar onReset={resetDefaults} />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Botón de restablecer compartido ──────────────────────────────────────────────

function SaveBar({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-wrap justify-end pt-5 mt-5 border-t border-default">
      <Button variant="secondary" onClick={onReset}>Restablecer valores por defecto</Button>
    </div>
  );
}
