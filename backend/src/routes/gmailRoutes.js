/*
  Rutas de conexión Gmail (montadas en /api/gmail SIN auth global: el
  callback llega desde Google sin token de la app; cada ruta que lo
  necesita aplica authMiddleware individualmente).

  El "state" del OAuth es un JWT corto firmado por el servidor que ata el
  callback al usuario que inició la conexión (nadie puede enganchar su
  buzón a otra cuenta).
*/
const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/userModel');
const gmail = require('../services/gmailService');

const router = express.Router();

// Estado de la conexión (para pintar la UI)
router.get('/status', authMiddleware, async (req, res) => {
  const user = req.user;
  res.json({
    configured: gmail.isConfigured(),
    connected: Boolean(user.gmailRefreshToken),
    email: user.gmailEmail || null,
    lastSync: user.gmailLastSync || null,
  });
});

// URL de consentimiento de Google
router.get('/auth-url', authMiddleware, (req, res) => {
  if (!gmail.isConfigured()) {
    return res.status(503).json({
      error: 'gmail_no_configurado',
      message: 'Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI en el servidor.',
    });
  }
  const state = jwt.sign(
    { userId: req.user._id, purpose: 'gmail_oauth' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );
  res.json({ url: gmail.getAuthUrl(state) });
});

// Callback de Google (el navegador llega aquí redirigido, sin token de la app)
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const back = (ok, detail = '') => {
    const url = new URL(process.env.GMAIL_POSTLOGIN_URL || 'http://localhost:3001/gmail');
    url.searchParams.set(ok ? 'connected' : 'error', ok ? '1' : detail || '1');
    res.redirect(url.toString());
  };

  try {
    if (error) return back(false, String(error));
    if (!code || !state) return back(false, 'respuesta_incompleta');

    let decoded;
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET);
    } catch {
      return back(false, 'estado_invalido');
    }
    if (decoded.purpose !== 'gmail_oauth' || !decoded.userId) {
      return back(false, 'estado_invalido');
    }

    const tokens = await gmail.exchangeCode(String(code));

    // El id_token trae el correo de la cuenta conectada (JWT de Google)
    let gmailEmail = null;
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8'));
        gmailEmail = payload.email || null;
      } catch { /* opcional */ }
    }

    await User.findByIdAndUpdate(decoded.userId, {
      $set: {
        gmailEmail,
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token || undefined,
        gmailTokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      },
    });

    return back(true);
  } catch (err) {
    console.error('❌ Error en callback de Gmail:', err.message);
    return back(false, 'intercambio_fallido');
  }
});

// Sincronizar ahora (lee SOLO correos del remitente BCP)
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    if (!req.user.gmailRefreshToken) {
      return res.status(409).json({ error: 'gmail_no_conectado', message: 'Conecta tu Gmail primero.' });
    }
    const io = req.app.get('io');
    const stats = await gmail.syncUser(req.user, { sinceDays: 90, io });
    res.json({ message: 'Sincronización completada', ...stats });
  } catch (err) {
    console.error('❌ Error sincronizando Gmail:', err.message);
    res.status(500).json({ error: 'No se pudo sincronizar con Gmail', details: err.message });
  }
});

// Desconectar (borra tokens; no toca movimientos ya importados)
router.post('/disconnect', authMiddleware, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      gmailEmail: null,
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
    },
  });
  res.json({ message: 'Gmail desconectado' });
});

module.exports = router;
