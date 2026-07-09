import { ReactNode } from 'react';

export function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-20 w-16 h-16 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-32 w-24 h-24 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '4s', transform: 'translate(-50%, -50%)' }} />
      </div>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex relative z-10 animate-fade-in-up">
        {/* Panel izquierdo — Presentación de la app */}
        <div className="w-1/2 bg-gradient-to-br from-teal-500 to-teal-600 p-12 flex-col justify-center text-white relative overflow-hidden hidden md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-spin-slow" style={{ animationDuration: '20s' }} />
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center mb-8 animate-fade-in-left">
              <div className="w-16 h-16 mr-5 animate-bounce-slow">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                  <circle cx="50" cy="35" r="15" fill="currentColor" opacity="0.8" />
                  <ellipse cx="42" cy="28" rx="4" ry="8" fill="currentColor" />
                  <ellipse cx="58" cy="28" rx="4" ry="8" fill="currentColor" />
                  <circle cx="45" cy="32" r="2" fill="white" />
                  <circle cx="55" cy="32" r="2" fill="white" />
                  <ellipse cx="50" cy="65" rx="20" ry="25" fill="currentColor" opacity="0.9" />
                  <circle cx="30" cy="85" r="8" fill="currentColor" opacity="0.7" />
                  <circle cx="70" cy="85" r="8" fill="currentColor" opacity="0.7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold drop-shadow-md">Hoptolt</h1>
            </div>

            <h2 className="text-2xl font-semibold mb-4 animate-fade-in-left" style={{ animationDelay: '0.2s' }}>
              Sistema de Gestión de Conejos
            </h2>
            <p className="text-lg md:text-xl font-medium mb-8 text-teal-50 animate-fade-in-left leading-relaxed" style={{ animationDelay: '0.4s' }}>
              Plataforma para la gestión de criaderos de conejos, control de alimentación, vacunación, partos y reportes.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📋', label: 'Gestión de Galpones' },
                { icon: '💉', label: 'Control y Sanidad' },
                { icon: '📊', label: 'Reportes Básicos' },
                { icon: '👥', label: 'Gestión de Trabajadores' },
              ].map(({ icon, label }, i) => (
                <div
                  key={label}
                  className="flex items-center p-4 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all animate-fade-in-up"
                  style={{ animationDelay: `${0.8 + i * 0.1}s` }}
                >
                  <span className="text-2xl mr-3">{icon}</span>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — Formulario dinámico */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
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
        @keyframes bounce-slow {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animate-fade-in-left { animation: fade-in-left 1s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 1s ease-out; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
