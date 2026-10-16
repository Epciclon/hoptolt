/**
 * Utilidad centralizada para traducir mensajes de error de Supabase Auth al español.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.';

  let rawMessage = '';

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    rawMessage =
      (typeof errObj.message === 'string' && errObj.message) ||
      (typeof errObj.error_description === 'string' && errObj.error_description) ||
      (typeof errObj.msg === 'string' && errObj.msg) ||
      (typeof errObj.error === 'string' && errObj.error) ||
      '';
  }

  if (!rawMessage) {
    rawMessage = String(error);
  }

  // Normalizar: decodificar URL y reemplazar signos '+' por espacios
  try {
    rawMessage = decodeURIComponent(rawMessage.replace(/\+/g, ' '));
  } catch {
    // Si falla decodeURIComponent, continuar con rawMessage
  }

  const clean = rawMessage.trim();

  // 1. Rate limiting con segundos específicos (ej: "For security purposes, you can only request this after 27 seconds.")
  const secondsMatch = clean.match(/after (\d+) seconds?/i);
  if (secondsMatch) {
    const secs = secondsMatch[1];
    return `Por motivos de seguridad, debes esperar ${secs} segundo${secs === '1' ? '' : 's'} antes de volver a solicitarlo.`;
  }

  // Otros límites de velocidad
  if (
    /rate limit/i.test(clean) ||
    /over_email_send_rate_limit/i.test(clean) ||
    /over_request_rate_limit/i.test(clean) ||
    /too many requests/i.test(clean)
  ) {
    return 'Has superado el límite de intentos. Por favor espera unos momentos antes de volver a intentarlo.';
  }

  // 2. Reutilización de contraseña (status 422 de Supabase)
  if (
    /different from the (?:old|current) password/i.test(clean) ||
    /same_password/i.test(clean) ||
    /should be different/i.test(clean)
  ) {
    return 'La nueva contraseña debe ser diferente a la contraseña actual.';
  }

  // 3. Validación de contraseñas
  if (/at least 6 characters/i.test(clean)) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (/password is too weak/i.test(clean) || /weak_password/i.test(clean)) {
    return 'La contraseña es muy débil. Debe tener al menos 6 caracteres con números o letras.';
  }
  if (/signup requires a valid password/i.test(clean)) {
    return 'Debes ingresar una contraseña válida.';
  }

  // 4. Enlaces de recuperación inválidos o expirados
  if (
    /email link is invalid or has expired/i.test(clean) ||
    /token has expired or is invalid/i.test(clean) ||
    /otp_expired/i.test(clean)
  ) {
    return 'El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.';
  }
  if (/code verifier/i.test(clean) || /pkce/i.test(clean)) {
    return 'El enlace fue abierto en un navegador o dispositivo diferente al que lo solicitó. Por favor solicita un nuevo enlace desde este mismo navegador o usa el enlace en el navegador original.';
  }
  if (
    /auth session missing/i.test(clean) ||
    /user from sub claim/i.test(clean) ||
    /session_not_found/i.test(clean)
  ) {
    return 'La sesión de recuperación ha expirado o no es válida. Solicita un nuevo enlace.';
  }

  // 5. Credenciales y registro
  if (/invalid login credentials/i.test(clean)) {
    return 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
  }
  if (/email not confirmed/i.test(clean)) {
    return 'Tu cuenta aún no ha sido confirmada. Revisa tu correo electrónico para verificarla.';
  }
  if (/user already registered/i.test(clean)) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (/user not found/i.test(clean)) {
    return 'No se encontró ninguna cuenta asociada a este correo o usuario.';
  }
  if (/unable to validate email/i.test(clean) || /invalid email/i.test(clean)) {
    return 'El formato del correo electrónico no es válido.';
  }

  // 6. Conexión de red
  if (/network request failed/i.test(clean) || /failed to fetch/i.test(clean)) {
    return 'Error de conexión. Verifica tu conexión a internet e inténtalo nuevamente.';
  }

  return clean;
}
