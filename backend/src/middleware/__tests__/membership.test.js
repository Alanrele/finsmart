/*
  Pruebas del gating Platinum: regla pura (computeMembership) con reloj
  controlado, middleware requierePlatinum (403 sin ejecutar el handler) y
  garantía de que un usuario bloqueado NUNCA llega a la API externa de IA.
*/
const express = require('express');
const http = require('http');
const {
  computeMembership,
  requierePlatinum,
  TRIAL_DURATION_MS,
} = require('../membership');

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-08T12:00:00Z');

describe('computeMembership (reloj del servidor)', () => {
  test('usuario platinum → PLATINUM sin restricciones', () => {
    const m = computeMembership({ esPlatinum: true, trialUsado: false }, NOW);
    expect(m.estado).toBe('PLATINUM');
  });

  test('platinum tiene prioridad aunque el trial haya expirado', () => {
    const m = computeMembership(
      { esPlatinum: true, trialUsado: true, trialIniciadoEn: new Date(NOW.getTime() - 30 * DAY_MS) },
      NOW
    );
    expect(m.estado).toBe('PLATINUM');
  });

  test('trial activo (día 6 de 7) → TRIAL_ACTIVO con tiempo restante', () => {
    const inicio = new Date(NOW.getTime() - 6 * DAY_MS);
    const m = computeMembership({ esPlatinum: false, trialUsado: true, trialIniciadoEn: inicio }, NOW);
    expect(m.estado).toBe('TRIAL_ACTIVO');
    expect(m.msRestantes).toBe(1 * DAY_MS);
    expect(m.diasRestantes).toBe(1);
    expect(m.expiraEn).toBe(new Date(inicio.getTime() + TRIAL_DURATION_MS).toISOString());
  });

  test('trial expira exactamente a las 168 horas (no un ms más)', () => {
    const inicio = new Date(NOW.getTime() - TRIAL_DURATION_MS);
    const justoExpirado = computeMembership({ trialUsado: true, trialIniciadoEn: inicio }, NOW);
    expect(justoExpirado.estado).toBe('BLOQUEADO');
    expect(justoExpirado.motivo).toBe('trial_expirado');

    const unMsAntes = computeMembership(
      { trialUsado: true, trialIniciadoEn: new Date(inicio.getTime() + 1) },
      NOW
    );
    expect(unMsAntes.estado).toBe('TRIAL_ACTIVO');
  });

  test('trial expirado (día 8) → BLOQUEADO permanente con motivo trial_expirado', () => {
    const m = computeMembership(
      { esPlatinum: false, trialUsado: true, trialIniciadoEn: new Date(NOW.getTime() - 8 * DAY_MS) },
      NOW
    );
    expect(m.estado).toBe('BLOQUEADO');
    expect(m.motivo).toBe('trial_expirado');
    expect(m.trialUsado).toBe(true);
  });

  test('usuario sin trial → BLOQUEADO con motivo sin_trial', () => {
    const m = computeMembership({ esPlatinum: false, trialUsado: false, trialIniciadoEn: null }, NOW);
    expect(m.estado).toBe('BLOQUEADO');
    expect(m.motivo).toBe('sin_trial');
    expect(m.trialUsado).toBe(false);
  });

  test('la expiración depende del reloj pasado (servidor), no de datos del cliente', () => {
    const user = { trialUsado: true, trialIniciadoEn: new Date('2026-07-01T00:00:00Z') };
    // "Hoy" según servidor: día 9 → bloqueado, aunque el cliente crea otra cosa
    expect(computeMembership(user, new Date('2026-07-10T00:00:00Z')).estado).toBe('BLOQUEADO');
    // Día 3 → activo
    expect(computeMembership(user, new Date('2026-07-04T00:00:00Z')).estado).toBe('TRIAL_ACTIVO');
  });

  test('trialUsado sin fecha de inicio (dato inconsistente) → BLOQUEADO, nunca acceso', () => {
    const m = computeMembership({ trialUsado: true, trialIniciadoEn: null }, NOW);
    expect(m.estado).toBe('BLOQUEADO');
  });
});

describe('requierePlatinum (middleware)', () => {
  const run = (user) =>
    new Promise((resolve) => {
      const req = { user };
      const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; resolve({ res: this, nextCalled: false }); },
      };
      requierePlatinum(req, res, () => resolve({ res, nextCalled: true, req }));
    });

  test('platinum pasa y recibe req.membresia', async () => {
    const { nextCalled, req } = await run({ esPlatinum: true });
    expect(nextCalled).toBe(true);
    expect(req.membresia.estado).toBe('PLATINUM');
  });

  test('trial activo pasa', async () => {
    const { nextCalled } = await run({
      trialUsado: true,
      trialIniciadoEn: new Date(Date.now() - 2 * DAY_MS),
    });
    expect(nextCalled).toBe(true);
  });

  test('bloqueado recibe 403 con code PLATINUM_REQUERIDO y NO pasa', async () => {
    const { res, nextCalled } = await run({ esPlatinum: false, trialUsado: false });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('PLATINUM_REQUERIDO');
    expect(res.body.membresia.estado).toBe('BLOQUEADO');
  });
});

describe('un usuario bloqueado no genera llamadas a la API externa de IA', () => {
  // App express real con la misma composición que server.js:
  // gate ANTES del handler que "llama" al proveedor de IA (spy).
  const buildApp = (user) => {
    const iaSpy = jest.fn().mockResolvedValue('respuesta IA');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = user; next(); }); // simula authMiddleware
    app.post('/api/ai/chat', requierePlatinum, async (_req, res) => {
      const out = await iaSpy(); // representa openai.chat.completions.create
      res.json({ out });
    });
    return { app, iaSpy };
  };

  const request = (app, path) =>
    new Promise((resolve, reject) => {
      const server = app.listen(0, () => {
        const { port } = server.address();
        const req = http.request(
          { port, path, method: 'POST', headers: { 'Content-Type': 'application/json' } },
          (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: data }); });
          }
        );
        req.on('error', (e) => { server.close(); reject(e); });
        req.end('{}');
      });
    });

  test('bloqueado: 403 y el proveedor de IA recibe CERO llamadas', async () => {
    const { app, iaSpy } = buildApp({ esPlatinum: false, trialUsado: false });
    const resp = await request(app, '/api/ai/chat');
    expect(resp.status).toBe(403);
    expect(iaSpy).not.toHaveBeenCalled();
  });

  test('trial expirado: 403 y cero llamadas al proveedor', async () => {
    const { app, iaSpy } = buildApp({
      trialUsado: true,
      trialIniciadoEn: new Date(Date.now() - 10 * DAY_MS),
    });
    const resp = await request(app, '/api/ai/chat');
    expect(resp.status).toBe(403);
    expect(iaSpy).not.toHaveBeenCalled();
  });

  test('trial activo: el handler sí ejecuta (1 llamada)', async () => {
    const { app, iaSpy } = buildApp({
      trialUsado: true,
      trialIniciadoEn: new Date(Date.now() - 1 * DAY_MS),
    });
    const resp = await request(app, '/api/ai/chat');
    expect(resp.status).toBe(200);
    expect(iaSpy).toHaveBeenCalledTimes(1);
  });
});
