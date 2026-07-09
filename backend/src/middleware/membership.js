/*
  Gating de membresía Platinum con trial único de 7 días.

  Regla (calculada SIEMPRE con el reloj del servidor):
    PLATINUM      → user.esPlatinum
    TRIAL_ACTIVO  → trialUsado && ahora < trialIniciadoEn + 7 días
    BLOQUEADO     → lo demás (motivo: 'sin_trial' | 'trial_expirado')

  `requierePlatinum` corre después de authMiddleware (req.user ya viene fresco
  de la BD en cada petición) y ANTES de cualquier handler que toque la API
  externa de IA: un usuario bloqueado recibe 403 sin ejecutar nada más.
*/

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 168 horas

const ESTADOS = {
  PLATINUM: 'PLATINUM',
  TRIAL_ACTIVO: 'TRIAL_ACTIVO',
  BLOQUEADO: 'BLOQUEADO',
};

/*
  Función pura: estado de membresía de un usuario en el instante `now`.
  Devuelve { estado, motivo?, trialUsado, msRestantes?, diasRestantes?, expiraEn? }.
*/
function computeMembership(user, now = new Date()) {
  const trialUsado = Boolean(user?.trialUsado);

  if (user?.esPlatinum) {
    return { estado: ESTADOS.PLATINUM, trialUsado };
  }

  if (trialUsado && user?.trialIniciadoEn) {
    const inicio = new Date(user.trialIniciadoEn).getTime();
    const expiraEn = inicio + TRIAL_DURATION_MS;
    const msRestantes = expiraEn - now.getTime();
    if (Number.isFinite(inicio) && msRestantes > 0) {
      return {
        estado: ESTADOS.TRIAL_ACTIVO,
        trialUsado: true,
        msRestantes,
        diasRestantes: Math.ceil(msRestantes / (24 * 60 * 60 * 1000)),
        expiraEn: new Date(expiraEn).toISOString(),
      };
    }
    return { estado: ESTADOS.BLOQUEADO, motivo: 'trial_expirado', trialUsado: true };
  }

  return { estado: ESTADOS.BLOQUEADO, motivo: 'sin_trial', trialUsado };
}

/*
  Middleware: deja pasar PLATINUM y TRIAL_ACTIVO; a los demás les responde 403
  con code PLATINUM_REQUERIDO y el estado, sin ejecutar el handler.
*/
function requierePlatinum(req, res, next) {
  const membresia = computeMembership(req.user, new Date());
  if (membresia.estado === ESTADOS.BLOQUEADO) {
    return res.status(403).json({
      error: 'Esta función requiere membresía Platinum',
      code: 'PLATINUM_REQUERIDO',
      membresia,
    });
  }
  req.membresia = membresia;
  return next();
}

module.exports = { computeMembership, requierePlatinum, TRIAL_DURATION_MS, ESTADOS };
