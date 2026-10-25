/**
 * Utilidades de audio mediante Web Audio API sintetizado.
 * No requiere archivos externos .mp3 ni descargas de red.
 * Incluye gestión de contexto compartido y desbloqueo mediante interacción del usuario.
 */

let sharedAudioCtx: AudioContext | null = null;
let pendingIncidentSound = false;
let pendingNotificationSound = false;
let pendingWarningAlertSound = false;
let hasUserGesture = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

// Desbloquear automáticamente el AudioContext con la primera interacción del usuario en la ventana
if (typeof window !== 'undefined' && !(window as any).__audioUnlockSetup) {
  (window as any).__audioUnlockSetup = true;

  const unlockAudio = () => {
    hasUserGesture = true;
    const ctx = getAudioContext();
    if (ctx) {
      const playPending = () => {
        if (pendingIncidentSound) {
          pendingIncidentSound = false;
          executeIncidentArpeggio(ctx);
        } else if (pendingWarningAlertSound) {
          pendingWarningAlertSound = false;
          executeWarningAlertTone(ctx);
        } else if (pendingNotificationSound) {
          pendingNotificationSound = false;
          executeNotificationSweep(ctx);
        }
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(playPending).catch(() => {});
      } else {
        playPending();
      }
    }
  };

  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true, capture: true });
  });
}

function executeNotificationSweep(ctx: AudioContext) {
  try {
    const now = ctx.currentTime + 0.03;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.error('Error executing notification sweep:', err);
  }
}

export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      pendingNotificationSound = true;
      if (hasUserGesture) {
        ctx.resume().then(() => {
          if (pendingNotificationSound) {
            pendingNotificationSound = false;
            executeNotificationSweep(ctx);
          }
        }).catch(() => {});
      }
      return;
    }

    executeNotificationSweep(ctx);
  } catch (e) {
    console.error('Error playing notification sound:', e);
  }
}

function executeIncidentArpeggio(ctx: AudioContext) {
  try {
    const now = ctx.currentTime + 0.03;

    // Nota 1: Do5 (523.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Nota 2: Mi5 (659.25Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.14);
    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.35);

    // Nota 3: Sol5 (783.99Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, now + 0.28);
    gain3.gain.setValueAtTime(0, now + 0.28);
    gain3.gain.linearRampToValueAtTime(0.4, now + 0.31);
    gain3.gain.exponentialRampToValueAtTime(0.005, now + 0.65);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.28);
    osc3.stop(now + 0.65);
  } catch (err) {
    console.error('Error executing incident arpeggio:', err);
  }
}

/**
 * Sonido distintivo para Novedades e Incidencias del Galpón.
 * Arpegio ascendente de tres notas claras y armónicas.
 */
export function playIncidentSound() {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      pendingIncidentSound = true;
      if (hasUserGesture) {
        ctx.resume().then(() => {
          if (pendingIncidentSound) {
            pendingIncidentSound = false;
            executeIncidentArpeggio(ctx);
          }
        }).catch(() => {});
      }
      return;
    }

    executeIncidentArpeggio(ctx);
  } catch (e) {
    console.error('Error playing incident sound:', e);
  }
}

/**
 * Tono dual sintético para Alertas Críticas y Advertencias Operativas.
 * Dos pulsos sonoros claros y directos que transmiten atención inmediata.
 */
function executeWarningAlertTone(ctx: AudioContext) {
  try {
    const now = ctx.currentTime + 0.02;

    // Pulso 1: Tono de alerta inicial en 659.25Hz (Mi5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Pulso 2: Tono de advertencia resolutivo en 880Hz (La5) con presencia
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.38);
  } catch (err) {
    console.error('Error executing warning alert tone:', err);
  }
}

/**
 * Sonido distintivo para Alertas Operativas y Tareas Urgentes del Galpón.
 */
export function playWarningAlertSound() {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      pendingWarningAlertSound = true;
      if (hasUserGesture) {
        ctx.resume().then(() => {
          if (pendingWarningAlertSound) {
            pendingWarningAlertSound = false;
            executeWarningAlertTone(ctx);
          }
        }).catch(() => {});
      }
      return;
    }

    executeWarningAlertTone(ctx);
  } catch (e) {
    console.error('Error playing warning alert sound:', e);
  }
}

