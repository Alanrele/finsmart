/*
  Rutas de importación de PDFs y gestión de credenciales de PDF.
  Requiere authMiddleware (montado en server.js), por lo que req.user existe.

  Flujo de subida:
    1) POST /api/pdf/process (multipart, campo "file"): intenta extraer texto.
       - Si el PDF no pide contraseña o se abre: importa y devuelve el resumen.
       - Si pide contraseña: primero prueba las credenciales GUARDADAS del usuario;
         si alguna funciona, importa. Si ninguna, responde 401 needsPassword.
    2) POST /api/pdf/unlock: reintenta con la contraseña provista; si "remember"
       es true y funciona, guarda la credencial cifrada para futuros archivos.

  Las credenciales de PDF son SEPARADAS de las API keys externas.
*/
const express = require('express');
const multer = require('multer');
const { prisma } = require('../config/prisma');
const { extractPdfText } = require('../services/pdfExtractor');
const { importStatement } = require('../services/statementImportService');
const { encryptCredential, decryptCredential } = require('../services/pdfCredentialService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

const currentYear = () => new Date().getFullYear();

// Intenta abrir el PDF con una lista de contraseñas candidatas (incluye vacía).
async function tryExtract(buffer, passwords) {
  for (const pwd of passwords) {
    const result = await extractPdfText(buffer, { password: pwd });
    if (result.status === 'ok' || result.status === 'scanned') {
      return { result, usedPassword: pwd || null };
    }
    if (result.status === 'error') {
      return { result, usedPassword: null };
    }
    // status === 'password' → probar la siguiente candidata
  }
  return { result: { status: 'password', reason: 'incorrect' }, usedPassword: null };
}

// POST /api/pdf/process
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    const userId = req.user._id;
    const fileName = req.file.originalname;
    const year = parseInt(req.body.year, 10) || currentYear();
    const account = req.body.account || null;

    // 1) intenta sin contraseña
    let attempt = await tryExtract(req.file.buffer, ['']);

    // 2) si pide contraseña, prueba las guardadas del usuario
    if (attempt.result.status === 'password') {
      const saved = await prisma.pdfCredential.findMany({ where: { userId } });
      const passwords = saved
        .map((c) => {
          try { return decryptCredential(c.cipher); } catch { return null; }
        })
        .filter(Boolean);
      if (passwords.length > 0) {
        attempt = await tryExtract(req.file.buffer, passwords);
        // marca la credencial usada
        if (attempt.usedPassword) {
          const used = saved.find((c) => {
            try { return decryptCredential(c.cipher) === attempt.usedPassword; } catch { return false; }
          });
          if (used) {
            await prisma.pdfCredential.update({ where: { id: used.id }, data: { lastUsedAt: new Date() } });
          }
        }
      }
    }

    const { result } = attempt;

    if (result.status === 'password') {
      return res.status(401).json({
        error: 'password_required',
        message: 'Este PDF requiere una credencial. Ingrésela para continuar.',
        fileName,
      });
    }
    if (result.status === 'error') {
      return res.status(422).json({ error: 'pdf_error', message: 'No se pudo leer el PDF.', fileName });
    }
    if (result.status === 'scanned') {
      return res.status(200).json({
        status: 'unprocessable',
        message: 'El PDF parece ser una imagen escaneada sin texto seleccionable. No se pudo extraer movimientos.',
        fileName,
        summary: { new: 0, duplicates: 0, unclassified: 0, scanned: true },
      });
    }

    const summary = await importStatement({ userId, text: result.text, year, fileName, account });
    return res.json({ status: 'ok', fileName, summary });
  } catch (err) {
    console.error('❌ PDF process error:', err);
    return res.status(500).json({ error: 'Error al procesar el PDF', details: err.message });
  }
});

// POST /api/pdf/unlock  (multipart con file + password + remember + label)
router.post('/unlock', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    const userId = req.user._id;
    const fileName = req.file.originalname;
    const year = parseInt(req.body.year, 10) || currentYear();
    const account = req.body.account || null;
    const password = req.body.password;
    const remember = req.body.remember === 'true' || req.body.remember === true;
    const label = (req.body.label || fileName || 'Credencial PDF').slice(0, 80);

    if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

    const result = await extractPdfText(req.file.buffer, { password });

    if (result.status === 'password') {
      return res.status(401).json({
        error: 'password_incorrect',
        message: 'La credencial es incorrecta. Inténtelo de nuevo.',
        fileName,
      });
    }
    if (result.status === 'error') {
      return res.status(422).json({ error: 'pdf_error', message: 'No se pudo leer el PDF.', fileName });
    }

    // Contraseña correcta → si el usuario lo pidió, guardar cifrada
    if (remember) {
      await prisma.pdfCredential.create({
        data: { userId, label, cipher: encryptCredential(password) },
      });
    }

    if (result.status === 'scanned') {
      return res.status(200).json({
        status: 'unprocessable',
        message: 'PDF desbloqueado pero sin texto seleccionable (escaneado). No se extrajeron movimientos.',
        fileName,
        summary: { new: 0, duplicates: 0, unclassified: 0, scanned: true },
      });
    }

    const summary = await importStatement({ userId, text: result.text, year, fileName, account });
    return res.json({ status: 'ok', fileName, summary, remembered: remember });
  } catch (err) {
    console.error('❌ PDF unlock error:', err);
    return res.status(500).json({ error: 'Error al desbloquear el PDF', details: err.message });
  }
});

// GET /api/pdf/credentials  → lista (sin exponer la contraseña en claro)
router.get('/credentials', async (req, res) => {
  const userId = req.user._id;
  const creds = await prisma.pdfCredential.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true },
  });
  res.json({ credentials: creds });
});

// DELETE /api/pdf/credentials/:id
router.delete('/credentials/:id', async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  const cred = await prisma.pdfCredential.findFirst({ where: { id, userId } });
  if (!cred) return res.status(404).json({ error: 'Credencial no encontrada' });
  await prisma.pdfCredential.delete({ where: { id } });
  res.json({ message: 'Credencial eliminada' });
});

module.exports = router;
