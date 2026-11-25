import { ReactNode } from 'react';

export function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#263445] to-teal-900 flex items-center justify-center p-2.5 sm:p-4 md:p-6 relative overflow-hidden">
      {/* Acentos geométricos sutiles alineados a la paleta HopTolt */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#1abc9c]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl bg-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex relative z-10 animate-fade-in-up">
        {/* Panel izquierdo — Presentación de la app */}
        <div className="w-1/2 bg-gradient-to-br from-teal-500 to-teal-600 p-8 lg:p-10 flex-col justify-center text-white relative overflow-hidden hidden md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-spin-slow pointer-events-none" style={{ animationDuration: '20s' }} />
          <div className="relative z-10">
            {/* Logo con silueta horizontal de conejo */}
            <div className="flex items-center gap-4 mb-5 lg:mb-6 animate-fade-in-left">
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-lg shrink-0">
                <svg viewBox="0 0 64 48" className="w-10 h-10 text-white" fill="none" aria-hidden="true">
                  {/* Oreja trasera */}
                  <path
                    d="M36 16C34 9 36.5 3.5 40.5 3.5C43.5 3.5 44.5 9 42.5 16"
                    fill="currentColor"
                    fillOpacity="0.65"
                  />
                  {/* Oreja principal */}
                  <path
                    d="M39.5 16.5C40.5 8 44.5 3 48 4C51 4.8 49.5 11.5 46 18"
                    fill="currentColor"
                  />
                  {/* Cola */}
                  <circle cx="11.5" cy="31" r="4.5" fill="currentColor" fillOpacity="0.9" />
                  {/* Cuerpo horizontal en perfil */}
                  <path
                    d="M14 33C13 24 20 18.5 30.5 19.5C35.5 20 39 17.5 43.5 17.5C49 17.5 53.5 21 53.5 25.5C53.5 28.8 50.5 31 46.5 31.5C45 34.5 44 37.5 45.5 40.5H39.5C38.5 37.5 38.5 34.5 39 33C34.5 33.8 29 34 24.5 33.5C22.5 36.5 22.5 38.5 24.5 40.5H16C14 38.5 14 35.5 14 33Z"
                    fill="currentColor"
                  />
                  {/* Pata delantera */}
                  <path d="M41.5 30.5L47 40.5H42L38 32.5Z" fill="currentColor" />
                  {/* Ojo */}
                  <circle cx="46.5" cy="23.5" r="1.4" fill="#0d9488" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold drop-shadow-md leading-none">Hoptolt</h1>
                <p className="text-xs text-teal-100/90 font-medium tracking-wide mt-1">Gestión Cunícola Automatizada</p>
              </div>
            </div>

            <h2 className="text-xl lg:text-2xl font-semibold mb-3 animate-fade-in-left" style={{ animationDelay: '0.2s' }}>
              Sistema de Gestión de Conejos
            </h2>
            <p className="text-sm lg:text-base font-medium mb-5 lg:mb-6 text-teal-50 animate-fade-in-left leading-relaxed" style={{ animationDelay: '0.4s' }}>
              Plataforma para la gestión de criaderos de conejos, control de alimentación, vacunación, partos y reportes.
            </p>

            <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
              {[
                { icon: '📋', label: 'Gestión de Galpones' },
                { icon: '💉', label: 'Control y Sanidad' },
                { icon: '📊', label: 'Reportes Básicos' },
                { icon: '👥', label: 'Gestión de Trabajadores' },
              ].map(({ icon, label }, i) => (
                <div
                  key={label}
                  className="flex items-center p-2.5 lg:p-3 bg-card/10 rounded-xl backdrop-blur-sm hover:bg-card/20 transition-all animate-fade-in-up"
                  style={{ animationDelay: `${0.8 + i * 0.1}s` }}
                >
                  <span className="text-xl mr-2.5">{icon}</span>
                  <span className="font-semibold text-xs lg:text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — Formulario dinámico */}
        <div className="w-full md:w-1/2 px-5 py-6 sm:px-8 sm:py-8 md:px-8 md:py-8 lg:p-10 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {children}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animate-fade-in-left { animation: fade-in-left 1s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 1s ease-out; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}</style>
    </div>
  );
}
