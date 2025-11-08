const { normalizeEmailBody } = require('../../normalize');
const {
  extractAmountAndCurrency,
  parseSpanishDate,
  sanitizeMerchantName,
} = require('./shared');

function buildAsciiMap(content) {
  const map = {};

  if (!content) {
    return map;
  }

  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/\s*[:\t]\s*/);
      if (parts.length >= 2) {
        const key = parts[0].toLowerCase();
        const value = parts.slice(1).join(' ').trim();
        if (value && !map[key]) {
          map[key] = value;
        }
      }
    });

  return map;
}

function deriveMerchant(fields, normalizedText, asciiMap, subject) {
  if (fields.merchant) {
    return;
  }

  if (asciiMap['empresa']) {
    fields.merchant = sanitizeMerchantName(asciiMap['empresa']) || fields.merchant;
  }

  if (!fields.merchant && asciiMap['nombre del comercio']) {
    fields.merchant = sanitizeMerchantName(asciiMap['nombre del comercio']) || fields.merchant;
  }

  if (!fields.merchant) {
    const paymentLine = normalizedText.match(/pago en\s+([^\.\n]+)/i);
    if (paymentLine) {
      fields.merchant = sanitizeMerchantName(`Pago en ${paymentLine[1].trim()}`) || fields.merchant;
    }
  }

  if (!fields.merchant) {
    const consumptionLine = normalizedText.match(/consumo[^\n]*en\s+([^\.\n]+)/i);
    if (consumptionLine) {
      fields.merchant = sanitizeMerchantName(consumptionLine[1]) || fields.merchant;
    }
  }

  if (!fields.merchant && subject) {
    const subjectMatch = subject.match(/pago en\s+([^\n]+)/i);
    if (subjectMatch) {
      fields.merchant = sanitizeMerchantName(`Pago en ${subjectMatch[1].trim()}`) || fields.merchant;
    }
  }
}

function extractFromText({ text, html, subject }) {
  const rawContent = text || html || '';
  const normalizedText = normalizeEmailBody(rawContent);
  const asciiContent = rawContent
    ? rawContent
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    : '';

  const asciiMap = buildAsciiMap(asciiContent);
  const fields = {};

  fields.normalizedText = normalizedText;

  const htmlAmount = extractAmountAndCurrency(html);
  const textAmount = extractAmountAndCurrency(rawContent);
  fields.amountInfo = htmlAmount || textAmount || null;

  const parsedDate = parseSpanishDate(normalizedText);
  if (parsedDate) {
    fields.date = parsedDate;
  }

  const operationTypeMatch = normalizedText.match(/operaci[oó]n (?:realizada|tipo):?\s*([^\n]+)/i);
  if (operationTypeMatch) {
    fields.operationType = operationTypeMatch[1].trim();
  }

  const operationNumberMatch = normalizedText.match(/n[uú]mero de operaci[oó]n[:\s]+([A-Za-z0-9-]+)/i);
  if (operationNumberMatch) {
    fields.operationNumber = operationNumberMatch[1].trim();
  }

  const channelMatch = normalizedText.match(/canal[:\s]+([^\n]+)/i);
  if (channelMatch) {
    fields.channel = channelMatch[1].trim();
  } else if (asciiMap.canal) {
    fields.channel = asciiMap.canal;
  }

  const beneficiaryMatch = normalizedText.match(/beneficiario[:\s]+([^\n]+)/i);
  if (beneficiaryMatch) {
    fields.beneficiary = beneficiaryMatch[1].trim();
  } else if (asciiMap['enviado a']) {
    fields.beneficiary = asciiMap['enviado a'].replace(/\s*\*+\s*\d{4}$/i, '').trim();
  }

  if (asciiMap['servicio']) {
    fields.serviceName = asciiMap['servicio'];
  }

  if (asciiMap['titular del servicio']) {
    fields.serviceHolder = asciiMap['titular del servicio'];
  }

  if (asciiMap['codigo de usuario']) {
    fields.serviceCode = asciiMap['codigo de usuario'];
  } else if (asciiMap['codigo de cliente']) {
    fields.serviceCode = asciiMap['codigo de cliente'];
  }

  if (asciiMap['banco destino']) {
    fields.bankDest = asciiMap['banco destino'];
  }

  const cardMatch = normalizedText.match(/numero de tarjeta(?: de credito| de debito)?[^\d]*(\d{4})/i);
  if (cardMatch) {
    fields.cardLast4 = cardMatch[1];
  } else if (asciiMap['numero de tarjeta de debito']) {
    const digits = asciiMap['numero de tarjeta de debito'].match(/(\d{4})$/);
    if (digits) {
      fields.cardLast4 = digits[1];
    }
  }

  const beneficiaryDigitsMatch = asciiContent.match(/enviado a[^\n]*\n\*+\s*(\d{4})/i);
  if (beneficiaryDigitsMatch) {
    fields.beneficiaryAccount = beneficiaryDigitsMatch[1];
  }

  const originLabel = asciiMap['cuenta de origen'];
  if (originLabel) {
    const originDigits = originLabel.match(/(\d{4})$/);
    if (originDigits) {
      fields.originAccount = originDigits[1];
    }
  }

  if (!fields.originAccount) {
    const originInlineMatch = asciiContent.match(/cuenta (?:digital|de ahorros|origen)[^\n]*\*+\s*(\d{4})/i);
    if (originInlineMatch) {
      fields.originAccount = originInlineMatch[1];
    }
  }

  if (!fields.originAccount) {
    const originNextLineMatch = asciiContent.match(/cuenta (?:digital|de ahorros|origen)[^\n]*\n\*+\s*(\d{4})/i);
    if (originNextLineMatch) {
      fields.originAccount = originNextLineMatch[1];
    }
  }

  deriveMerchant(fields, normalizedText, asciiMap, subject);

  if (subject) {
    fields.subject = subject;
  }

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

module.exports = {
  extractFromText,
};
