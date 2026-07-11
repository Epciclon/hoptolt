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

// ── Aplicar preferencias al DOM ──────────────────────────────────────────────

function applyToDOM(fontSize: string, fontFamily: string, bold: boolean) {
  document.documentElement.style.fontSize = fontSize;
  // Aplicar fuente en body (donde Tailwind la define) para que surta efecto
  if (fontFamily) {
    document.body.style.fontFamily = fontFamily;
  } else {
    document.body.style.removeProperty('font-family');
  }
  if (bold) {
    document.body.style.fontWeight = '600';
  } else {
    document.body.style.removeProperty('font-weight');
  }
}

// ── Tipos de sección ──────────────────────────────────────────────────────────

type Section = 'size' | 'family' | 'bold' | 'dark' | 'contrast';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ElementType;
  ready: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'size',     label: 'Tamaño de Letra',   icon: ALargeSmall, ready: true  },
  { id: 'family',   label: 'Tipo de Letra',      icon: Type,        ready: true  },
  { id: 'bold',     label: 'Texto en Negrilla',  icon: Bold,        ready: true  },
  { id: 'dark',     label: 'Modo Oscuro',         icon: Moon,        ready: false },
  { id: 'contrast', label: 'Alto Contraste',      icon: Contrast,    ready: false },
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

  useEffect(() => {
    const size   = localStorage.getItem('fontSize')   ?? '16px';
    const family = localStorage.getItem('fontFamily') ?? '';
    const bld    = localStorage.getItem('fontBold')   === 'true';
    setFontSize(size);
    setFontFamily(family);
    setBold(bld);
    applyToDOM(size, family, bld);
  }, []);

  const selectSize = useCallback((key: string) => {
    setFontSize(key);
    applyToDOM(key, fontFamily, bold);
  }, [fontFamily, bold]);

  const selectFamily = useCallback((key: string) => {
    setFontFamily(key);
    applyToDOM(fontSize, key, bold);
  }, [fontSize, bold]);

  const toggleBold = useCallback(() => {
    const next = !bold;
    setBold(next);
    applyToDOM(fontSize, fontFamily, next);
  }, [bold, fontSize, fontFamily]);

  const savePreferences = () => {
    localStorage.setItem('fontSize', fontSize);
    if (fontFamily) localStorage.setItem('fontFamily', fontFamily);
    else localStorage.removeItem('fontFamily');
    localStorage.setItem('fontBold', String(bold));
    showToast('Preferencias guardadas', 'success');
  };

  const resetDefaults = () => {
    setFontSize('16px');
    setFontFamily('');
    setBold(false);
    applyToDOM('16px', '', false);
    localStorage.setItem('fontSize', '16px');
    localStorage.removeItem('fontFamily');
    localStorage.removeItem('fontBold');
    showToast('Preferencias restablecidas', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Apariencia del Sistema</h1>
        <p className="text-slate-500 mt-1">Personaliza el aspecto visual para una experiencia más cómoda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Sidebar nav */}
        <Card className="md:col-span-1" padding="sm">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon, ready }) => (
              <button
                key={id}
                onClick={() => ready && setActiveSection(id)}
                disabled={!ready}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left w-full",
                  !ready && "opacity-50 cursor-not-allowed",
                  ready && activeSection === id
                    ? "bg-primary-50 text-primary-600"
                    : ready
                    ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    : "text-slate-400"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {label}
                </span>
                {!ready && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-normal">
                    Pronto
                  </span>
                )}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content area */}
        <div className="md:col-span-3 flex flex-col gap-4">
          {/* ── Tamaño de Letra ── */}
          {activeSection === 'size' && (
            <Card>
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <ALargeSmall className="text-primary-500" size={20} />
                Tamaño de Letra
              </h3>
              <p className="text-sm text-slate-500 mb-6">El cambio se aplica de inmediato en toda la aplicación.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {FONT_SIZES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => selectSize(f.key)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                      fontSize === f.key
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50',
                    )}
                  >
                    {fontSize === f.key && (
                      <span className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                        <CheckIcon />
                      </span>
                    )}
                    <span style={{ fontSize: f.key }} className="font-semibold text-slate-700 leading-none">
                      Aa
                    </span>
                    <span className="text-xs text-slate-500 leading-tight">{f.label}</span>
                    <span className="text-[11px] text-slate-400">{f.key}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-xs mb-1">Vista previa con el tamaño actual:</p>
                <p style={{ fontSize }} className="text-slate-800 font-medium">
                  Hoptolt — Sistema de gestión de crianza de conejos
                </p>
              </div>

              <SaveBar onSave={savePreferences} onReset={resetDefaults} />
            </Card>
          )}

          {/* ── Tipo de Letra ── */}
          {activeSection === 'family' && (
            <Card>
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Type className="text-primary-500" size={20} />
                Tipo de Letra
              </h3>
              <p className="text-sm text-slate-500 mb-6">Elige la fuente que te resulte más cómoda de leer.</p>

              <div className="flex flex-col gap-3">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => selectFamily(f.key)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      fontFamily === f.key
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      fontFamily === f.key ? 'border-primary-500 bg-primary-500' : 'border-slate-300',
                    )}>
                      {fontFamily === f.key && <CheckIcon />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700" style={{ fontFamily: f.key || undefined }}>
                        {f.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>
                      <p
                        className="text-sm text-slate-600 mt-2 pt-2 border-t border-slate-100"
                        style={{ fontFamily: f.key || undefined, fontSize }}
                      >
                        Hoptolt — Sistema de gestión de crianza
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <SaveBar onSave={savePreferences} onReset={resetDefaults} />
            </Card>
          )}

          {/* ── Texto en Negrilla ── */}
          {activeSection === 'bold' && (
            <Card>
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Bold className="text-primary-500" size={20} />
                Texto en Negrilla
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Aumenta el peso del texto para mejorar la legibilidad, especialmente útil en tamaños de letra grandes.
              </p>

              <div className="flex flex-col gap-3">
                {[
                  { value: false, label: 'Normal', description: 'Peso estándar del texto — predeterminado' },
                  { value: true,  label: 'Negrilla', description: 'Texto más grueso — mayor legibilidad' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => { setBold(opt.value); applyToDOM(fontSize, fontFamily, opt.value); }}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      bold === opt.value
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50',
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
                        className="text-slate-700"
                        style={{ fontWeight: opt.value ? 700 : 400, fontSize }}
                      >
                        {opt.label} — Hoptolt Sistema de Crianza
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <SaveBar onSave={savePreferences} onReset={resetDefaults} />
            </Card>
          )}

          {/* ── Próximamente ── */}
          {(activeSection === 'dark' || activeSection === 'contrast') && (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                {activeSection === 'dark'
                  ? <Moon size={48} className="text-slate-300" />
                  : <Contrast size={48} className="text-slate-300" />
                }
                <div>
                  <h3 className="text-lg font-semibold text-slate-700">
                    {activeSection === 'dark' ? 'Modo Oscuro' : 'Alto Contraste'}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Esta función estará disponible próximamente.</p>
                </div>
                <span className="px-3 py-1 bg-primary-50 text-primary-600 text-xs font-medium rounded-full border border-primary-200">
                  Próximamente
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Barra de acciones compartida ──────────────────────────────────────────────

function SaveBar({ onSave, onReset }: { onSave: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-wrap gap-3 pt-5 mt-5 border-t border-slate-100">
      <Button onClick={onSave} size="lg">Guardar preferencias</Button>
      <Button variant="secondary" size="lg" onClick={onReset}>Restablecer valores por defecto</Button>
    </div>
  );
}
