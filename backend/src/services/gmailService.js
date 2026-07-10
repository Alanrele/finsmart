/*
  Conexión Gmail (reemplaza la sincronización por Outlook/Graph).

  - OAuth 2.0 de Google con scope de SOLO LECTURA (gmail.readonly).
  - Solo se consultan correos del remitente oficial del BCP: el query de la
    API de Gmail filtra `from:notificaciones@notificacionesbcp.com.pe`, así
    ningún otro correo del buzón se lee ni se almacena.
  - Cada correo pasa por el MISMO pipeline estricto que ya existe:
    parseEmailContent (parser V2 determinístico) → ingestParsedEmail
    (validación de etiquetas, bandeja de revisión, dedup en 3 niveles,
    clasificación por reglas). Aquí no se duplica ninguna lógica.

  Configuración (variables de entorno, NO tocadas por código):
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI  (ej. http://localhost:5000/api/gmail/callback)
    GMAIL_POSTLOGIN_URL  (opcional; adónde volver tras conectar,
                          por defecto http://localhost:3001/gmail)
*/
const User = require('../models/userModel');
const { parseEmailContent } = require('./emailParser/parser');
const { isTransactionalEmail } = require('./emailParser/detection');
const { ingestParsedEmail } = require('./emailIngest');

const BCP_SENDER = 'notificaciones@notificacionesbcp.com.pe';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly openid email';

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    postLoginUrl: process.env.GMAIL_POSTLOGIN_URL || 'http://localhost:3001/gmail',
  };
}

function isConfigured() {
  const { clientId, clientSecret, redirectUri } = getConfig();
  return Boolean(clientId && clientSecret && redirectUri);
}

function getAuthUrl(state) {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // refresh token para sincronizar sin re-login
    prompt: 'consent',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCode(code) {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    throw new Error(`Intercambio de código falló (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, id_token }
}

async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Refresh de token falló (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

/* Devuelve un access token vigente, refrescándolo si expiró. */
async function getValidAccessToken(user) {
  const expiry = user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : 0;
  if (user.gmailAccessToken && Date.now() < expiry - 60_000) {
    return user.gmailAccessToken;
  }
  if (!user.gmailRefreshToken) {
    throw new Error('Gmail no conectado (sin refresh token)');
  }
  const refreshed = await refreshAccessToken(user.gmailRefreshToken);
  await User.findByIdAndUpdate(user._id, {
    $set: {
      gmailAccessToken: refreshed.access_token,
      gmailTokenExpiry: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000),
    },
  });
  return refreshed.access_token;
}

async function gmailGet(accessToken, path) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

/* Decodifica base64url del cuerpo de Gmail. */
function decodeBody(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/* Extrae subject/from de headers y el mejor cuerpo (HTML > texto). */
function extractMessageContent(message) {
  const headers = message.payload?.headers || [];
  const header = (name) => headers.find((h) => h.name?.toLowerCase() === name)?.value || '';

  let html = '';
  let text = '';
  const walk = (part) => {
    if (!part) return;
    if (part.mimeType === 'text/html' && part.body?.data) html = html || decodeBody(part.body.data);
    if (part.mimeType === 'text/plain' && part.body?.data) text = text || decodeBody(part.body.data);
    (part.parts || []).forEach(walk);
  };
  walk(message.payload);
  if (!html && !text && message.payload?.body?.data) {
    const raw = decodeBody(message.payload.body.data);
    if ((message.payload.mimeType || '').includes('html')) html = raw;
    else text = raw;
  }

  return {
    id: message.id,
    subject: header('subject'),
    from: header('from'),
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    html,
    text,
  };
}

/*
  Sincroniza los correos BCP del usuario. `sinceDays` acota la búsqueda.
  Devuelve { processed, created, duplicates, review }.
*/
async function syncUser(user, { sinceDays = 90, io } = {}) {
  if (!isConfigured()) throw new Error('Gmail no está configurado en el servidor');
  const accessToken = await getValidAccessToken(user);

  // SOLO el remitente oficial del BCP; nada más se lee del buzón
  const query = encodeURIComponent(`from:${BCP_SENDER} newer_than:${sinceDays}d`);
  let pageToken = '';
  const ids = [];
  do {
    const page = await gmailGet(
      accessToken,
      `/messages?q=${query}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`,
    );
    (page.messages || []).forEach((m) => ids.push(m.id));
    pageToken = page.nextPageToken || '';
  } while (pageToken && ids.length < 500);

  const stats = { processed: 0, created: 0, duplicates: 0, review: 0 };

  for (const id of ids) {
    stats.processed += 1;
    const full = await gmailGet(accessToken, `/messages/${id}?format=full`);
    const content = extractMessageContent(full);

    // Cinturón y tirantes: valida el remitente también en el mensaje
    if (!content.from.toLowerCase().includes(BCP_SENDER)) continue;
    if (!isTransactionalEmail(content.subject, content.html || content.text, { from: BCP_SENDER })) continue;

    const parseResult = parseEmailContent({
      subject: content.subject,
      html: content.html,
      text: content.text,
      receivedAt: content.receivedAt,
    });

    const result = await ingestParsedEmail(
      {
        userId: user._id,
        message: { id: content.id, subject: content.subject, receivedDateTime: content.receivedAt },
        parseResult,
        rawBody: content.text || content.html || content.subject,
      },
      { io },
    );

    if (result.status === 'created') {
      stats.created += 1;
      if (io) {
        io.to(`user-${user._id}`).emit('new-transaction', { ...result.transaction, isNew: true, fromSync: true });
      }
    } else if (result.status === 'duplicate') {
      stats.duplicates += 1;
    } else {
      stats.review += 1;
    }
  }

  await User.findByIdAndUpdate(user._id, { $set: { gmailLastSync: new Date() } });
  return stats;
}

module.exports = {
  isConfigured,
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getValidAccessToken,
  extractMessageContent,
  decodeBody,
  syncUser,
  BCP_SENDER,
};
