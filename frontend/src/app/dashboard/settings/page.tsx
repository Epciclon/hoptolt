'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, Button } from '@/shared/ui';
import { Type, Check, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_SIZES = [
  { key: '14px', label: 'Pequeña'      },
  { key: '16px', label: 'Normal'       },
  { key: '18px', label: 'Grande'       },
  { key: '20px', label: 'Muy grande'   },
  { key: '22px', label: 'Extra grande' },
];

const FONT_FAMILIES = [
  { key: '',                            label: 'Inter (predeterminado)', description: 'Fuente moderna y limpia' },
  { key: "'Georgia', serif",            label: 'Georgia',                description: 'Clásica con serifas — cómoda en textos largos' },
  { key: "'Arial', sans-serif",         label: 'Arial',                  description: 'Familiar y ampliamente usada' },
  { key: "'Verdana', sans-serif",       label: 'Verdana',                description: 'Diseñada para pantalla — letras bien separadas' },
  { key: "'Trebuchet MS', sans-serif",  label: 'Trebuchet MS',           description: 'Moderna y de alta legibilidad' },
];

function applyToDOM(fontSize: string, fontFamily: string) {
  document.documentElement.style.fontSize = fontSize;
  if (fontFamily) {
    document.documentElement.style.fontFamily = fontFamily;
  } else {
    document.documentElement.style.removeProperty('font-family');
  }
}

export default function SettingsPage() {
  const [fontSize, setFontSize]   = useState('16px');
  const [fontFamily, setFontFamily] = useState('');
  const [saved, setSaved]           = useState(false);
  const [savedAt, setSavedAt]       = useState('');

  useEffect(() => {
    const size   = localStorage.getItem('fontSize')   ?? '16px';
    const family = localStorage.getItem('fontFamily') ?? '';
    setFontSize(size);
    setFontFamily(family);
    applyToDOM(size, family);
  }, []);

  const selectSize = useCallback((key: string) => {
    setFontSize(key);
    applyToDOM(key, fontFamily);
  }, [fontFamily]);

  const selectFamily = useCallback((key: string) => {
    setFontFamily(key);
    applyToDOM(fontSize, key);
  }, [fontSize]);

  const savePreferences = () => {
    localStorage.setItem('fontSize', fontSize);
    if (fontFamily) {
      localStorage.setItem('fontFamily', fontFamily);
    } else {
      localStorage.removeItem('fontFamily');
    }
    const now = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    setSavedAt(now);
    setSaved(true);
    setTimeout(() => setSaved(false), 5000);
  };

  const resetDefaults = () => {
    setFontSize('16px');
    setFontFamily('');
    applyToDOM('16px', '');
    localStorage.setItem('fontSize', '16px');
    localStorage.removeItem('fontFamily');
    const now = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    setSavedAt(now);
    setSaved(true);
    setTimeout(() => setSaved(false), 5000);
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-base font-medium">
          <CheckCircle size={20} className="shrink-0 text-emerald-500" />
          Preferencias guardadas correctamente a las {savedAt}. Se mantendrán al recargar la página.
        </div>
      )}

      <Card>
        <CardHeader
          title="Apariencia del Sistema"
          subtitle="Los cambios se aplican de inmediato. Presiona Guardar para que persistan al recargar."
        />

        <div className="flex flex-col gap-8 pt-2">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Type size={18} className="text-primary-500" />
              <h3 className="text-base font-semibold text-slate-700">Tamaño de letra</h3>
              <span className="text-sm text-slate-400 ml-1">(preview instantáneo)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                    <span className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </span>
                  )}
                  <span style={{ fontSize: f.key }} className="font-semibold text-slate-700 leading-none">
                    Aa
                  </span>
                  <span className="text-xs text-slate-500 leading-tight">{f.label}</span>
                  <span className="text-xs text-slate-400">{f.key}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Type size={18} className="text-primary-500" />
              <h3 className="text-base font-semibold text-slate-700">Tipo de letra</h3>
              <span className="text-sm text-slate-400 ml-1">(preview instantáneo)</span>
            </div>
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
                    {fontFamily === f.key && <Check size={11} className="text-white" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-700" style={{ fontFamily: f.key || undefined }}>
                      {f.label}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">{f.description}</p>
                    <p className="text-sm text-slate-600 mt-2" style={{ fontFamily: f.key || undefined }}>
                      Hoptolt — Sistema de gestión de crianza
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button onClick={savePreferences} size="lg">
              Guardar preferencias
            </Button>
            <Button variant="secondary" size="lg" onClick={resetDefaults}>
              Restablecer valores por defecto
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
