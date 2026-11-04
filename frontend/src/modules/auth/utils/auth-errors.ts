interface ErrorPattern {
  regex: RegExp;
  message: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    regex: /rate limit|over_email_send_rate_limit|over_request_rate_limit|too many requests/i,
    message: 'Has superado el límite de intentos. Por favor espera unos momentos antes de volver a intentarlo.',
  },
  {
    regex: /different from the (?:old|current) password|same_password|should be different/i,
    message: 'La nueva contraseña debe ser diferente a la contraseña actual.',
  },
  {
    regex: /at least 6 characters/i,
    message: 'La contraseña debe tener al menos 6 caracteres.',
  },
  {
    regex: /password is too weak|weak_password/i,
    message: 'La contraseña es muy débil. Debe tener al menos 6 caracteres con números o letras.',
  },
  {
    regex: /signup requires a valid password/i,
    message: 'Debes ingresar una contraseña válida.',
  },
  {
    regex: /email link is invalid or has expired|token has expired or is invalid|otp_expired/i,
    message: 'El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.',
  },
  {
    regex: /code verifier|pkce/i,
    message: 'El enlace fue abierto en un navegador o dispositivo diferente al que lo solicitó. Por favor solicita un nuevo enlace desde este mismo navegador o usa el enlace en el navegador original.',
  },
  {
    regex: /auth session missing|user from sub claim|session_not_found/i,
    message: 'La sesión de recuperación ha expirado o no es válida. Solicita un nuevo enlace.',
  },
  {
    regex: /invalid login credentials/i,
    message: 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
  },
  {
    regex: /email not confirmed/i,
    message: 'Tu cuenta aún no ha sido confirmada. Revisa tu correo electrónico para verificarla.',
  },
  {
    regex: /user already registered/i,
    message: 'Ya existe una cuenta registrada con este correo electrónico.',
  },
  {
    regex: /user not found/i,
    message: 'No se encontró ninguna cuenta asociada a este correo o usuario.',
  },
  {
    regex: /unable to validate email|invalid email/i,
    message: 'El formato del correo electrónico no es válido.',
  },
  {
    regex: /network request failed|failed to fetch/i,
    message: 'Error de conexión. Verifica tu conexión a internet e inténtalo nuevamente.',
  },
];

function extractRawMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    const msg = errObj.message || errObj.error_description || errObj.msg || errObj.error;
    if (typeof msg === 'string') return msg;
  }
  return String(error || '');
}

/**
 * Utilidad centralizada para traducir mensajes de error de Supabase Auth al español.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.';

  let rawMessage = extractRawMessage(error);

  // Normalizar: decodificar URL y reemplazar signos '+' por espacios
  try {
    rawMessage = decodeURIComponent(rawMessage.replace(/\+/g, ' '));
  } catch {
    // Si falla decodeURIComponent, continuar con rawMessage
  }

  const clean = rawMessage.trim();

  // 1. Rate limiting con segundos específicos
  const secondsMatch = clean.match(/after (\d+) seconds?/i);
  if (secondsMatch) {
    const secs = secondsMatch[1];
    return `Por motivos de seguridad, debes esperar ${secs} segundo${secs === '1' ? '' : 's'} antes de volver a solicitarlo.`;
  }

  for (const item of ERROR_PATTERNS) {
    if (item.regex.test(clean)) {
      return item.message;
    }
  }

  return clean;
}
