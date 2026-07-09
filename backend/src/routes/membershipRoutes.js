/*
  Rutas de membresía Platinum (montadas en /api/membresia tras authMiddleware).

  GET  /estado  → estado calculado con el reloj del servidor
                  (PLATINUM / TRIAL_ACTIVO con tiempo restante / BLOQUEADO con motivo).
  POST /trial   → activa el trial de 7 días. UNA sola vez por usuario:
                  no renovable, no repetible, no reactivable (409 si ya se usó).
                  El timestamp se toma del servidor, nunca del cliente.
*/
const express = require('express');
const User = require('../models/userModel');
const { computeMembership } = require('../middleware/membership');

const router = express.Router();

router.get('/estado', (req, res) => {
  res.json({ membresia: computeMembership(req.user, new Date()) });
});

router.post('/trial', async (req, res) => {
  try {
    const user = req.user;

    if (user.esPlatinum) {
      return res.json({
        message: 'Ya tienes membresía Platinum; no necesitas trial.',
        membresia: computeMembership(user, new Date()),
      });
    }

    if (user.trialUsado) {
      return res.status(409).json({
        error: 'El trial gratuito ya fue utilizado y no puede reactivarse.',
        code: 'TRIAL_YA_USADO',
        membresia: computeMembership(user, new Date()),
      });
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: { trialUsado: true, trialIniciadoEn: new Date() } },
      { new: true }
    );

    return res.status(201).json({
      message: 'Trial Platinum de 7 días activado.',
      membresia: computeMembership(updated, new Date()),
    });
  } catch (error) {
    console.error('❌ Error activando trial:', error);
    return res.status(500).json({ error: 'No se pudo activar el trial' });
  }
});

module.exports = router;
