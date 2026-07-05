const crypto = require('crypto');
const { normalizeDescription, normalizeAccount } = require('./normalizeText');

/*
  Huella determinística de un movimiento para detectar duplicados.

  Compuesta por: fecha (día, sin hora) + monto (2 decimales, valor absoluto) +
  descripción normalizada + cuenta normalizada. Al normalizar la descripción,
  variaciones triviales (mayúsculas, acentos, espacios) no generan duplicados
  distintos. Re-subir el mismo PDF produce la misma huella → 0 inserciones.

  Nota: se usa la FECHA REAL del movimiento (no la de importación) para que el
  hash sea estable sin importar cuándo se sube el archivo.
*/
function buildDedupeHash({ date, amount, description, account }) {
  const day = toDayString(date);
  const amt = toAmountString(amount);
  const desc = normalizeDescription(description);
  const acc = normalizeAccount(account);

  const canonical = `${day}|${amt}|${desc}|${acc}`;
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function toDayString(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  // Día en UTC para estabilidad entre husos; el movimiento pertenece a un día calendario.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toAmountString(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return Math.abs(n).toFixed(2);
}

module.exports = { buildDedupeHash, toDayString, toAmountString };
