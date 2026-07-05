/*
  Normalización de texto para clasificación y deduplicación.
  Determinística: la misma entrada produce siempre la misma salida.

  - minúsculas
  - sin acentos/diacríticos (NFD + strip del bloque combining U+0300–U+036F)
  - colapsa espacios múltiples y recorta extremos
  - elimina caracteres de control (U+0000–U+001F)

  Se usa tanto para la huella de duplicados como para el motor de reglas,
  de modo que variaciones triviales ("PLIN  a  Juan" vs "plin a juan") no
  se traten como distintas.
*/
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f]', 'g');

function normalizeDescription(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(CONTROL_CHARS, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/*
  Normaliza el nombre de una cuenta/tarjeta para la huella: conserva solo
  dígitos y letras en minúscula (p. ej. "**** 1234" y "1234" coinciden).
*/
function normalizeAccount(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

module.exports = { normalizeDescription, normalizeAccount };
