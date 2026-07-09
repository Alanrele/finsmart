const { parseMoneyToCanonical } = require('../email/normalize');

/*
  Parser de movimientos a partir del TEXTO extraído de un estado de cuenta PDF.
  Es una función pura y determinística: no consulta BD ni servicios externos.

  Formato de salida por movimiento (normalizado):
    {
      date,            // ISO 8601 con offset de Lima, a nivel de día
      description,     // concepto original completo (sin recortar semántica)
      amount,          // número positivo
      type,            // 'income' | 'expense'
      currency,        // 'PEN' | 'USD'
      source,          // p.ej. 'pdf:estado-marzo.pdf'
      account,         // nombre/rango de cuenta si se conoce
    }

  Lo que no se puede parsear NO se inventa: se devuelve en `unparsable` para
  avisar al usuario (regla "nunca fingir datos").
*/

const LIMA_OFFSET = '-05:00';

// Fecha al inicio de línea: DD/MM, DD/MM/YY, DD/MM/YYYY, DD-MM-YYYY
const LEADING_DATE = /^\s*(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/;

// Fecha con mes abreviado en español: 26Ene, 05 Feb (estados de tarjeta de crédito)
const LEADING_DATE_ES = /^\s*(\d{1,2})\s?(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Set|Sep|Oct|Nov|Dic)\b\.?/i;
const MONTHS_ES = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12,
};

// Reconoce cualquiera de los dos formatos de fecha al inicio del texto dado.
// Devuelve { day, month, rawYear, length } o null.
function matchLeadingDate(text) {
  const num = text.match(LEADING_DATE);
  if (num) {
    return { day: parseInt(num[1], 10), month: parseInt(num[2], 10), rawYear: num[3], length: num[0].length };
  }
  const es = text.match(LEADING_DATE_ES);
  if (es) {
    return { day: parseInt(es[1], 10), month: MONTHS_ES[es[2].toLowerCase()], rawYear: undefined, length: es[0].length };
  }
  return null;
}

// Token monetario: 1.234,56 | 1,234.56 | 55.50 | 55,50  (con opcional S/ US$)
const MONEY_TOKEN = /(?:S\/\.?|US\$|USD|PEN|\$)?\s*-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})/g;

// Palabras que marcan un ingreso/abono aunque no haya columnas separadas
const CREDIT_HINTS = /\b(abono|deposito|dep[oó]sito|haberes|remuneraci[oó]n|interes|inter[eé]s|devoluci[oó]n|reverso|extorno|ingreso|cr[eé]dito|yape recibido|plin recibido)\b/i;
const DEBIT_HINTS = /\b(cargo|consumo|compra|retiro|pago|comisi[oó]n|debito|d[eé]bito|transferencia a|envio|env[ií]o)\b/i;

function normalizeYear(rawYear, fallbackYear) {
  if (rawYear === undefined) return fallbackYear;
  const y = parseInt(rawYear, 10);
  if (rawYear.length === 2) return 2000 + y;
  return y;
}

function toIsoDay(day, month, year) {
  const pad = (v) => String(v).padStart(2, '0');
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}T00:00:00${LIMA_OFFSET}`;
}

/*
  Parsea una sola línea. Devuelve el movimiento o null si no aplica.
  `year` es el año del estado de cuenta (viene del encabezado del PDF).
  `columns`: si el estado tiene columnas cargo/abono separadas, se puede pasar
  { debitFirst: true } para asignar el tipo por posición; por defecto se infiere
  con las pistas de texto (CREDIT_HINTS / DEBIT_HINTS) y, en último caso, gasto.
*/
function parseStatementLine(line, { year, columns } = {}) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed) return null;

  let dateMatch = matchLeadingDate(trimmed);
  if (!dateMatch) return null;
  let dateLength = dateMatch.length;

  // Estados de tarjeta: "fecha de proceso  fecha de consumo  descripción...".
  // Si hay una segunda fecha pegada a la primera, esa (la de consumo) es la
  // que se usa como fecha del movimiento.
  const afterFirst = trimmed.slice(dateLength);
  const secondDate = matchLeadingDate(afterFirst);
  if (secondDate) {
    dateMatch = secondDate;
    dateLength += secondDate.length;
  }

  const { day, month } = dateMatch;
  const yr = normalizeYear(dateMatch.rawYear, year);
  if (!yr) return null;
  const iso = toIsoDay(day, month, yr);
  if (!iso) return null;

  // Tokens monetarios de la línea
  const moneyMatches = trimmed.match(MONEY_TOKEN);
  if (!moneyMatches || moneyMatches.length === 0) return null;

  // Selección del token de importe y del tipo.
  // - Layout con columnas cargo/abono (fecha ... cargo abono saldo): el importe
  //   es el token NO-CERO entre cargo y abono; el tipo, según cuál sea el no-cero.
  // - Sin columnas: último token = saldo, penúltimo = importe (o el único token).
  let amountToken;
  let columnType = null;

  const useColumns = columns && typeof columns.debitFirst === 'boolean' && moneyMatches.length >= 3;
  if (useColumns) {
    const cargoToken = moneyMatches[moneyMatches.length - 3];
    const abonoToken = moneyMatches[moneyMatches.length - 2];
    const cargoVal = safeNum(cargoToken);
    const abonoVal = safeNum(abonoToken);
    if (abonoVal > cargoVal) {
      amountToken = abonoToken;
      columnType = 'income';
    } else {
      amountToken = cargoToken;
      columnType = 'expense';
    }
  } else {
    amountToken = moneyMatches.length >= 2
      ? moneyMatches[moneyMatches.length - 2]
      : moneyMatches[0];
  }

  let parsedMoney;
  try {
    parsedMoney = parseMoneyToCanonical('', amountToken);
  } catch (_) {
    return null;
  }
  const amount = Math.abs(parseFloat(parsedMoney.value));
  if (!Number.isFinite(amount) || amount === 0) return null;

  // Descripción = texto entre la(s) fecha(s) y el primer token monetario
  const afterDate = trimmed.slice(dateLength);
  const firstMoneyIdx = afterDate.search(MONEY_TOKEN);
  const description = (firstMoneyIdx >= 0 ? afterDate.slice(0, firstMoneyIdx) : afterDate)
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!description) return null;

  // Tipo: por columnas si se indicó, si no por pistas de texto, si no gasto.
  let type = 'expense';
  const signedNegative = /-/.test(amountToken) || parsedMoney.value.startsWith('-');
  if (columnType) {
    type = columnType;
  } else if (CREDIT_HINTS.test(description)) {
    type = 'income';
  } else if (DEBIT_HINTS.test(description)) {
    type = 'expense';
  } else if (signedNegative) {
    type = 'expense';
  }

  const currency = parsedMoney.currency;

  return { date: iso, description, amount, type, currency };
}

function safeNum(token) {
  try {
    return Math.abs(parseFloat(parseMoneyToCanonical('', token).value)) || 0;
  } catch (_) {
    return 0;
  }
}

/*
  Parsea el texto completo del estado de cuenta.
  Devuelve { movements, unparsable, scanned }.
  - `year` obligatorio si las fechas vienen sin año (típico en estados mensuales).
  - Si el texto está vacío (PDF escaneado/imagen sin OCR), scanned=true y no se
    inventan movimientos.
*/
function parseStatementText(text, { year, source, account, columns } = {}) {
  const clean = (text || '').replace(/\r\n?/g, '\n');
  const nonEmpty = clean.split('\n').map(l => l.trim()).filter(Boolean);

  if (nonEmpty.length === 0) {
    return { movements: [], unparsable: [], scanned: true };
  }

  const movements = [];
  const unparsable = [];

  for (const line of nonEmpty) {
    // Solo intentamos líneas que empiezan con fecha (filas de movimiento)
    if (!LEADING_DATE.test(line) && !LEADING_DATE_ES.test(line)) continue;
    const mv = parseStatementLine(line, { year, columns });
    if (mv) {
      movements.push({ ...mv, source: source || null, account: account || null });
    } else {
      unparsable.push(line);
    }
  }

  return { movements, unparsable, scanned: false };
}

module.exports = {
  parseStatementLine,
  parseStatementText,
  toIsoDay,
};
