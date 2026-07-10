/*
  Normalización del campo "Empresa" de los correos BCP.

  El BCP envía el comercio con ruido: código numérico de terminal + nombre +
  ciudad/sucursal + códigos cortos. Ej.: "1048 MASS LIMA 11 BARR MS" → "MASS".

  Transformaciones (deterministas, en orden):
    1. Mayúsculas, sin acentos, espacios colapsados.
    2. Se elimina el código numérico inicial (terminal/tienda).
    3. Se corta desde el PRIMER token de ubicación conocido (ciudad/distrito),
       salvo que sea el primer token (el comercio podría llamarse así).
    4. Se eliminan tokens finales que son ruido: números sueltos (nro. de
       tienda) y códigos de 1–2 letras (sufijos de sucursal).

  SIEMPRE se conserva el valor original (comercio_raw / merchantRaw) para
  trazabilidad: esta función puede reajustarse sin perder el dato fuente.
  Si el resultado quedara vacío, se devuelve el texto limpio completo
  (nunca se inventa ni se devuelve cadena vacía).
*/

// Ciudades/distritos frecuentes en los sufijos de ubicación del BCP.
const LOCATION_TOKENS = new Set([
  'LIMA', 'CALLAO', 'AREQUIPA', 'TRUJILLO', 'CUSCO', 'CUZCO', 'PIURA',
  'CHICLAYO', 'IQUITOS', 'HUANCAYO', 'TACNA', 'ICA', 'PUCALLPA', 'CHIMBOTE',
  'HUACHO', 'BARRANCA', 'PATIVILCA', 'SUPE', 'HUARAL', 'HUAURA',
  'MIRAFLORES', 'SURCO', 'SURQUILLO', 'BARRANCO', 'CHORRILLOS', 'COMAS',
  'BRENA', 'RIMAC', 'LINCE', 'MAGDALENA', 'JESUS MARIA', 'PUEBLO LIBRE',
  'SAN ISIDRO', 'SAN BORJA', 'SAN MIGUEL', 'LOS OLIVOS', 'LA MOLINA',
  'LA VICTORIA', 'SAN JUAN', 'VILLA EL SALVADOR', 'ATE', 'SANTA ANITA',
  'INDEPENDENCIA', 'CARABAYLLO', 'PUENTE PIEDRA', 'LURIN', 'PERU',
]);

function cleanText(raw) {
  return String(raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9*/.\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMerchant(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = cleanText(raw);
  if (!cleaned) return null;

  let tokens = cleaned.split(' ');

  // 2) código numérico inicial (terminal/tienda): solo dígitos al comienzo
  while (tokens.length > 1 && /^\d+$/.test(tokens[0])) {
    tokens = tokens.slice(1);
  }

  // 3) cortar desde el primer token de ubicación (nunca el primero)
  for (let i = 1; i < tokens.length; i++) {
    if (LOCATION_TOKENS.has(tokens[i]) || LOCATION_TOKENS.has(`${tokens[i]} ${tokens[i + 1] || ''}`.trim())) {
      tokens = tokens.slice(0, i);
      break;
    }
  }

  // 4) ruido al final: números de tienda y códigos de 1–2 letras
  while (
    tokens.length > 1 &&
    (/^\d+$/.test(tokens[tokens.length - 1]) || /^[A-Z]{1,2}$/.test(tokens[tokens.length - 1]))
  ) {
    tokens = tokens.slice(0, -1);
  }

  const result = tokens.join(' ').trim();
  return result || cleaned;
}

module.exports = { normalizeMerchant };
