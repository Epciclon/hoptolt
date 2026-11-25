'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { Type, Bold, Moon, Contrast, ALargeSmall, Image as ImageIcon, Bell, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyThemeToDOM as applyToDOM,
  DEFAULT_AVATAR_SCALE,
  DEFAULT_AVATAR_SHAPE,
  parseAvatarShape,
  type AvatarShape,
} from '@/hooks/useThemeSync';

const FONT_SIZES = [
  { key: '14px', label: 'Pequeña'      },
  { key: '16px', label: 'Normal'       },
  { key: '18px', label: 'Grande'       },
  { key: '20px', label: 'Muy grande'   },
  { key: '22px', label: 'Extra grande' },
  { key: '24px', label: 'Máxima'       },
];

const AVATAR_SIZES = [
  { key: '1',    label: 'Pequeño',      previewPx: 44, isDefault: false },
  { key: '1.25', label: 'Mediano',      previewPx: 56, isDefault: true  },
  { key: '1.5',  label: 'Grande',       previewPx: 68, isDefault: false },
  { key: '1.75', label: 'Extra Grande', previewPx: 80, isDefault: false },
  { key: '2',    label: 'Gigante',      previewPx: 92, isDefault: false },
];

const AVATAR_SHAPES: { key: AvatarShape; label: string; description: string; radiusClass: string }[] = [
  { key: 'circle',  label: 'Circular',            description: 'Forma redonda clásica',   radiusClass: 'rounded-full' },
  { key: 'rounded', label: 'Cuadrado redondeado', description: 'Esquinas suaves',         radiusClass: 'rounded-xl'   },
  { key: 'square',  label: 'Cuadrado recto',      description: 'Esquinas rectas y limpias', radiusClass: 'rounded-none' },
];

const FONT_FAMILIES = [
  { key: '',                              label: 'Segoe UI - Predeterminado', description: 'Fuente del sistema - moderna y clara' },
  { key: "'Calibri', sans-serif",          label: 'Calibri',                   description: 'Moderna y optimizada para pantalla - ideal para leer' },
  { key: "'Georgia', serif",              label: 'Georgia',                   description: 'Clásica con serifas - cómoda en textos largos' },
  { key: "'Arial', sans-serif",           label: 'Arial',                     description: 'Familiar y ampliamente usada' },
  { key: "'Verdana', sans-serif",         label: 'Verdana',                   description: 'Diseñada para pantalla - letras bien separadas' },
  { key: "'Trebuchet MS', sans-serif",    label: 'Trebuchet MS',              description: 'Moderna y de alta legibilidad' },
  { key: "'Courier New', monospace",      label: 'Courier New',               description: 'Monoespaciada - para quienes prefieren claridad total' },
];

type Section = 'size' | 'family' | 'bold' | 'dark' | 'contrast' | 'avatar' | 'previews';

interface NavItem {
  readonly id: Section;
  readonly label: string;
  readonly icon: React.ElementType;
  readonly ready: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'size',     label: 'Tamaño de Letra',       icon: ALargeSmall, ready: true  },
  { id: 'avatar',   label: 'Avatares y Fotos',      icon: ImageIcon,   ready: true  },
  { id: 'family',   label: 'Tipo de Letra',          icon: Type,        ready: true  },
  { id: 'bold',     label: 'Texto en Negrilla',      icon: Bold,        ready: true  },
  { id: 'dark',     label: 'Modo Oscuro',            icon: Moon,        ready: true },
  { id: 'contrast', label: 'Alto Contraste',         icon: Contrast,    ready: true },
  { id: 'previews', label: 'Avisos Flotantes',       icon: Bell,        ready: true },
];

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ThemeToggleSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onReset: () => void;
}

function ThemeToggleSection({
  title,
  description,
  icon: Icon,
  isActive,
  onEnable,
  onDisable,
  onReset,
}: Readonly<ThemeToggleSectionProps>) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
        <Icon className="text-primary-500" size={20} />
        {title}
      </h3>
      <p className="text-sm text-muted mb-6">
        {description}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
        <button
          type="button"
          onClick={onDisable}
          className={cn(
            'p-3 sm:p-4 border-2 rounded-xl text-center font-medium transition-colors cursor-pointer text-xs sm:text-sm',
            !isActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'border-default text-muted hover:bg-theme-surface dark:hover:bg-slate-800/50'
          )}
        >
          Desactivado
        </button>
        <button
          type="button"
          onClick={onEnable}
          className={cn(
            'p-3 sm:p-4 border-2 rounded-xl text-center font-medium transition-colors cursor-pointer text-xs sm:text-sm',
            isActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'border-default text-muted hover:bg-theme-surface dark:hover:bg-slate-800/50'
          )}
        >
          Activado
        </button>
      </div>
      <SaveBar onReset={onReset} />
    </div>
  );
}

interface PreviewToggleRowProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBoxClassName: string;
  enabled: boolean;
  onToggle: (val: boolean) => void;
}

function PreviewToggleRow({
  title,
  description,
  icon: Icon,
  iconBoxClassName,
  enabled,
  onToggle,
}: Readonly<PreviewToggleRowProps>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-default bg-theme-surface gap-4">
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-lg shrink-0', iconBoxClassName)}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="font-semibold text-main text-sm">{title}</h4>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg border transition-colors',
            !enabled
              ? 'border-primary-500 bg-primary-500 text-white shadow-sm'
              : 'border-default bg-card text-muted hover:bg-theme-surface hover:text-main'
          )}
        >
          Desactivado
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg border transition-colors',
            enabled
              ? 'border-primary-500 bg-primary-500 text-white shadow-sm'
              : 'border-default bg-card text-muted hover:bg-theme-surface hover:text-main'
          )}
        >
          Activado
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState<Section>('size');
  const [fontSize,   setFontSize]   = useState('16px');
  const [avatarScale, setAvatarScale] = useState(DEFAULT_AVATAR_SCALE);
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(DEFAULT_AVATAR_SHAPE);
  const [fontFamily, setFontFamily] = useState('');
  const [bold,       setBold]       = useState(false);
  const [theme,      setTheme]      = useState<'light' | 'dark' | 'contrast'>('light');
  const [previewNotifications, setPreviewNotifications] = useState(true);
  const [previewAlerts, setPreviewAlerts] = useState(true);
  const [previewIncidents, setPreviewIncidents] = useState(true);

  useEffect(() => {
    const size   = localStorage.getItem('fontSize')   ?? '16px';
    const avScale = localStorage.getItem('avatarScale') ?? DEFAULT_AVATAR_SCALE;
    const avShape = parseAvatarShape(localStorage.getItem('avatarShape'));
    const family = localStorage.getItem('fontFamily') ?? '';
    const bld    = localStorage.getItem('fontBold')   === 'true';
    const thm    = (localStorage.getItem('theme') as any) ?? 'light';
    const prevNotif = localStorage.getItem('hoptolt_preview_notifications') !== 'false';
    const prevAlert = localStorage.getItem('hoptolt_preview_alerts') !== 'false';
    const prevInc = localStorage.getItem('hoptolt_preview_incidents') !== 'false';
    setFontSize(size);
    setAvatarScale(avScale);
    setAvatarShape(avShape);
    setFontFamily(family);
    setBold(bld);
    setTheme(thm);
    setPreviewNotifications(prevNotif);
    setPreviewAlerts(prevAlert);
    setPreviewIncidents(prevInc);
    applyToDOM(size, family, bld, thm, avScale, avShape);
  }, []);

  const selectSize = useCallback((key: string) => {
    setFontSize(key);
    applyToDOM(key, fontFamily, bold, theme, avatarScale, avatarShape);
    localStorage.setItem('fontSize', key);
    showToast('Tamaño de letra actualizado', 'success');
  }, [fontFamily, bold, theme, avatarScale, avatarShape, showToast]);

  const selectAvatarScale = useCallback((key: string) => {
    setAvatarScale(key);
    applyToDOM(fontSize, fontFamily, bold, theme, key, avatarShape);
    localStorage.setItem('avatarScale', key);
    showToast('Tamaño de avatares actualizado', 'success');
  }, [fontSize, fontFamily, bold, theme, avatarShape, showToast]);

  const selectAvatarShape = useCallback((shape: AvatarShape) => {
    setAvatarShape(shape);
    applyToDOM(fontSize, fontFamily, bold, theme, avatarScale, shape);
    localStorage.setItem('avatarShape', shape);
    showToast('Forma de avatares actualizada', 'success');
  }, [fontSize, fontFamily, bold, theme, avatarScale, showToast]);

  const selectFamily = useCallback((key: string) => {
    setFontFamily(key);
    applyToDOM(fontSize, key, bold, theme, avatarScale, avatarShape);
    if (key) localStorage.setItem('fontFamily', key);
    else localStorage.removeItem('fontFamily');
    showToast('Tipo de letra actualizado', 'success');
  }, [fontSize, bold, theme, avatarScale, avatarShape, showToast]);

  const toggleBold = useCallback((opt: boolean) => {
    setBold(opt);
    applyToDOM(fontSize, fontFamily, opt, theme, avatarScale, avatarShape);
    localStorage.setItem('fontBold', String(opt));
    showToast(opt ? 'Negrilla activada' : 'Negrilla desactivada', 'success');
  }, [fontSize, fontFamily, theme, avatarScale, avatarShape, showToast]);

  const selectTheme = useCallback((thm: 'light' | 'dark' | 'contrast') => {
    setTheme(thm);
    applyToDOM(fontSize, fontFamily, bold, thm, avatarScale, avatarShape);
    localStorage.setItem('theme', thm);
    
    let msg = 'Modo normal activado';
    if (thm === 'dark') msg = 'Modo oscuro activado';
    else if (thm === 'contrast') msg = 'Alto contraste activado';
    showToast(msg, 'success');
  }, [fontSize, fontFamily, bold, avatarScale, avatarShape, showToast]);

  const updatePreviewSetting = useCallback((
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    storageKey: string,
    val: boolean,
    enabledLabel: string,
    disabledLabel: string
  ) => {
    setter(val);
    localStorage.setItem(storageKey, String(val));
    window.dispatchEvent(new CustomEvent('hoptolt_previews_changed'));
    showToast(val ? enabledLabel : disabledLabel, 'success');
  }, [showToast]);

  const resetDefaults = () => {
    setFontSize('16px');
    setAvatarScale(DEFAULT_AVATAR_SCALE);
    setAvatarShape(DEFAULT_AVATAR_SHAPE);
    setFontFamily('');
    setBold(false);
    setTheme('light');
    setPreviewNotifications(true);
    setPreviewAlerts(true);
    setPreviewIncidents(true);
    applyToDOM('16px', '', false, 'light', DEFAULT_AVATAR_SCALE, DEFAULT_AVATAR_SHAPE);
    localStorage.setItem('fontSize', '16px');
    localStorage.setItem('avatarScale', DEFAULT_AVATAR_SCALE);
    localStorage.removeItem('avatarShape');
    localStorage.removeItem('fontFamily');
    localStorage.removeItem('fontBold');
    localStorage.removeItem('theme');
    localStorage.removeItem('hoptolt_preview_notifications');
    localStorage.removeItem('hoptolt_preview_alerts');
    localStorage.removeItem('hoptolt_preview_incidents');
    window.dispatchEvent(new CustomEvent('hoptolt_previews_changed'));
    showToast('Preferencias restablecidas', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800/50 overflow-hidden" padding="none">
        <div className="p-4 sm:p-6 md:p-8 border-b border-default bg-card">
          <h1 className="text-2xl font-bold text-main">Apariencia</h1>
          <p className="text-muted mt-1">Ajusta los colores y el tamaño de letra a tu gusto para no cansarte la vista</p>
        </div>

        <div className="flex flex-col md:flex-row bg-card min-h-[calc(100vh-12rem)] w-full min-w-0 max-w-full">
          <div className="w-full md:w-64 shrink-0 p-3 sm:p-4 md:p-6 md:border-r border-default bg-card min-w-0 max-w-full overflow-hidden">
            <nav className="flex flex-row md:flex-col gap-1.5 sm:gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar w-full min-w-0">
              {NAV_ITEMS.map(({ id, label, icon: Icon, ready }) => (
                <button type="button"
                  key={id}
                  onClick={() => ready && setActiveSection(id)}
                  disabled={!ready}
                  className={cn(
                    'flex items-center justify-center md:justify-between gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 w-auto md:w-full cursor-pointer',
                    !ready && 'opacity-50 cursor-not-allowed text-theme-faint',
                    ready && activeSection === id && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold',
                    ready && activeSection !== id && 'text-muted hover:bg-theme-surface dark:hover:bg-slate-800/50 hover:text-main'
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

          <div className="flex-1 p-3.5 sm:p-6 md:p-8 bg-card flex flex-col gap-4 min-w-0 max-w-full overflow-hidden">
            {activeSection === 'size' && (
              <Card>
                <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                  <ALargeSmall className="text-primary-500" size={20} />
                  Tamaño de Letra
                </h3>
                <p className="text-sm text-muted mb-6">El cambio se aplica de inmediato en toda la aplicación.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {FONT_SIZES.map((f) => (
                    <button type="button"
                      key={f.key}
                      onClick={() => selectSize(f.key)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                        fontSize === f.key
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'border-strong bg-card hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-theme-surface dark:hover:bg-slate-800/50',
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
                    Hoptolt - Sistema de gestión de crianza de conejos
                  </p>
                </div>

                <SaveBar onReset={resetDefaults} />
              </Card>
            )}

            {activeSection === 'avatar' && (
              <Card>
                <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                  <ImageIcon className="text-primary-500" size={20} />
                  Avatares y Mini fotos
                </h3>
                <p className="text-sm text-muted mb-6">
                  Elige la forma y el tamaño de las fotos de los conejos en las tarjetas y listas del sistema.
                </p>

                <div className="mb-7">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                    Forma de los Avatares
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {AVATAR_SHAPES.map((shape) => (
                      <button
                        type="button"
                        key={shape.key}
                        onClick={() => selectAvatarShape(shape.key)}
                        className={cn(
                          'relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center cursor-pointer',
                          avatarShape === shape.key
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                            : 'border-strong bg-card hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-theme-surface dark:hover:bg-slate-800/50',
                        )}
                      >
                        {avatarShape === shape.key && (
                          <span className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                            <CheckIcon />
                          </span>
                        )}
                        <div
                          className={cn(
                            'w-12 h-12 bg-slate-200 dark:bg-slate-800 border border-strong flex items-center justify-center text-[10px] text-theme-faint font-medium uppercase',
                            shape.radiusClass,
                          )}
                        >
                          Sin foto
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-main block leading-tight">
                            {shape.label}
                          </span>
                          <span className="text-xs text-muted block mt-0.5">
                            {shape.description}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                    Tamaño de Avatares
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {AVATAR_SIZES.map((f) => {
                      const activeShapeRadius =
                        AVATAR_SHAPES.find((s) => s.key === avatarShape)?.radiusClass ?? 'rounded-full';
                      return (
                        <button
                          type="button"
                          key={f.key}
                          onClick={() => selectAvatarScale(f.key)}
                          className={cn(
                            'relative flex flex-col items-center justify-between gap-3 p-4 rounded-xl border-2 transition-all text-center cursor-pointer',
                            avatarScale === f.key
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                              : 'border-strong bg-card hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-theme-surface dark:hover:bg-slate-800/50',
                          )}
                        >
                          {avatarScale === f.key && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                              <CheckIcon />
                            </span>
                          )}
                          <div className="h-24 flex items-center justify-center w-full">
                            <div
                              style={{ width: f.previewPx, height: f.previewPx }}
                              className={cn(
                                'bg-slate-200 dark:bg-slate-800 border border-strong flex items-center justify-center text-[10px] text-theme-faint font-medium uppercase transition-all',
                                activeShapeRadius,
                              )}
                            >
                              Sin foto
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-main leading-none block">
                              {f.label}
                            </span>
                            {f.isDefault && (
                              <span className="text-[11px] text-muted block mt-1">Predeterminado</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SaveBar onReset={resetDefaults} />
              </Card>
            )}

            {activeSection === 'family' && (
              <Card>
                <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                  <Type className="text-primary-500" size={20} />
                  Tipo de Letra
                </h3>
                <p className="text-sm text-muted mb-6">Elige la fuente que te resulte más cómoda de leer.</p>

                <div className="flex flex-col gap-3">
                  {FONT_FAMILIES.map((f) => (
                    <button type="button"
                      key={f.key}
                      onClick={() => selectFamily(f.key)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                        fontFamily === f.key
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-strong bg-card hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-theme-surface dark:hover:bg-slate-800/50',
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
                          Hoptolt - Sistema de gestión de crianza
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <SaveBar onReset={resetDefaults} />
              </Card>
            )}

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
                    { value: false, label: 'Normal', description: 'Peso estándar del texto - predeterminado' },
                    { value: true,  label: 'Negrilla', description: 'Texto más grueso - mayor legibilidad' },
                  ].map((opt) => (
                    <button type="button"
                      key={String(opt.value)}
                      onClick={() => toggleBold(opt.value)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                        bold === opt.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-strong bg-card hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-theme-surface dark:hover:bg-slate-800/50',
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
                          {opt.label} - Hoptolt Sistema de Crianza
                        </p>
                        <p className="text-xs text-theme-faint mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <SaveBar onReset={resetDefaults} />
              </Card>
            )}

            {activeSection === 'dark' && (
              <ThemeToggleSection
                title="Modo Oscuro"
                description="Cambia la interfaz a colores oscuros para reducir la fatiga visual."
                icon={Moon}
                isActive={theme === 'dark'}
                onEnable={() => selectTheme('dark')}
                onDisable={() => { if (theme === 'dark') selectTheme('light'); }}
                onReset={resetDefaults}
              />
            )}

            {activeSection === 'contrast' && (
              <ThemeToggleSection
                title="Alto Contraste"
                description="Usa colores intensos - blanco, negro, amarillo - para máxima legibilidad."
                icon={Contrast}
                isActive={theme === 'contrast'}
                onEnable={() => selectTheme('contrast')}
                onDisable={() => { if (theme === 'contrast') selectTheme('light'); }}
                onReset={resetDefaults}
              />
            )}

            {activeSection === 'previews' && (
              <div className="max-w-3xl mx-auto w-full">
                <h3 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
                  <Bell className="text-primary-500" size={20} />
                  Avisos Flotantes
                </h3>
                <p className="text-sm text-muted mb-6">
                  Configura qué avisos emergentes deseas ver en pantalla al recibir novedades, alertas o notificaciones.
                </p>

                <div className="flex flex-col gap-4">
                  <PreviewToggleRow
                    title="Notificaciones Previas"
                    description="Muestra una ventana flotante momentánea cuando llegan avisos generales o actividades del sistema"
                    icon={Bell}
                    iconBoxClassName="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    enabled={previewNotifications}
                    onToggle={(val) =>
                      updatePreviewSetting(
                        setPreviewNotifications,
                        'hoptolt_preview_notifications',
                        val,
                        'Notificaciones previas activadas',
                        'Notificaciones previas desactivadas'
                      )
                    }
                  />

                  <PreviewToggleRow
                    title="Alertas Previas"
                    description="Muestra una ventana flotante momentánea para recordatorios urgentes de alimentación, partos o destetes"
                    icon={AlertTriangle}
                    iconBoxClassName="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                    enabled={previewAlerts}
                    onToggle={(val) =>
                      updatePreviewSetting(
                        setPreviewAlerts,
                        'hoptolt_preview_alerts',
                        val,
                        'Alertas previas activadas',
                        'Alertas previas desactivadas'
                      )
                    }
                  />

                  <PreviewToggleRow
                    title="Novedades Previas"
                    description="Muestra una ventana flotante momentánea cuando se reportan o responden incidencias y novedades del galpón"
                    icon={ShieldAlert}
                    iconBoxClassName="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                    enabled={previewIncidents}
                    onToggle={(val) =>
                      updatePreviewSetting(
                        setPreviewIncidents,
                        'hoptolt_preview_incidents',
                        val,
                        'Novedades previas activadas',
                        'Novedades previas desactivadas'
                      )
                    }
                  />
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

function SaveBar({ onReset }: Readonly<{ onReset: () => void }>) {
  return (
    <div className="flex flex-wrap justify-end pt-5 mt-5 border-t border-default w-full">
      <Button
        variant="secondary"
        onClick={onReset}
        className="w-full sm:w-auto min-h-[42px] h-auto py-2.5 px-4 text-center leading-normal whitespace-normal"
      >
        Restablecer valores por defecto
      </Button>
    </div>
  );
}
