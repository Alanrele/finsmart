/*
  Cifrado de credenciales (contraseñas) de PDF con AES-256-GCM.

  IMPORTANTE: estas credenciales de PDF son SEPARADAS de las API keys de
  servicios externos (Graph, OpenAI, Azure). No se mezclan ni se tocan.

  - Nunca se guarda la contraseña en texto plano.
  - La clave de cifrado sale de PDF_CRED_SECRET (env). Si no está definida en
    desarrollo, se deriva una clave efímera y se avisa por log (no persistente).
  - GCM añade authTag: si el ciphertext o la clave cambian, el descifrado falla.
*/
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = process.env.PDF_CRED_SECRET;
  if (secret && secret.length >= 16) {
    // Deriva 32 bytes determinísticos desde el secreto
    return crypto.createHash('sha256').update(String(secret)).digest();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PDF_CRED_SECRET no está configurado: no se pueden cifrar credenciales de PDF');
  }
  // Desarrollo: clave efímera por proceso (las credenciales no sobreviven a reinicios)
  if (!getKey._ephemeral) {
    getKey._ephemeral = crypto.randomBytes(32);
    // eslint-disable-next-line no-console
    console.warn('⚠️ PDF_CRED_SECRET ausente: usando clave efímera de desarrollo para credenciales de PDF');
  }
  return getKey._ephemeral;
}

/*
  Cifra una contraseña. Devuelve un blob serializable (para columna JSON):
    { v:1, iv, tag, data }  (todo en base64)
*/
function encryptCredential(plaintext) {
  if (!plaintext) throw new Error('La credencial no puede estar vacía');
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  };
}

/*
  Descifra un blob previamente producido por encryptCredential.
  Lanza si la clave/authTag no coinciden.
*/
function decryptCredential(blob) {
  if (!blob || !blob.iv || !blob.tag || !blob.data) {
    throw new Error('Blob de credencial inválido');
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(blob.data, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

module.exports = { encryptCredential, decryptCredential };
