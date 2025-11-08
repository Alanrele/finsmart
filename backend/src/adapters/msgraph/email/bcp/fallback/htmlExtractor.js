const cheerio = require('cheerio');
const {
  parseSpanishDate,
  extractAmountAndCurrency,
  sanitizeMerchantName,
} = require('./shared');

function extractFromHtml(html) {
  if (!html) {
    return {};
  }

  const fields = {};
  const $ = cheerio.load(html);

  $('table tr').each((_, row) => {
    const $row = $(row);
    const $cells = $row.find('td');
    if ($cells.length < 2) {
      return;
    }

    const label = $cells
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    let value = $cells
      .last()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    value = value.replace(/\*\*\*\*\s*/g, '').split('\n')[0].trim();

    if (label.includes('fecha y hora')) {
      const parsedDate = parseSpanishDate(value);
      if (parsedDate) {
        fields.date = parsedDate;
      }
    } else if (label.includes('banco destino')) {
      fields.bankDest = value;
    } else if (label.includes('numero de operacion') || label.includes('número de operación') || label.includes('operacion')) {
      fields.operationNumber = value;
    } else if (label.includes('canal')) {
      fields.channel = value;
    } else if (label.includes('desde')) {
      const match = value.match(/(\d{4})$/);
      if (match) {
        fields.originAccount = match[1];
      }
    } else if (label.includes('enviado a') || label.includes('beneficiario')) {
      fields.beneficiary = value.replace(/\s*\d{4}$/, '').trim();
    } else if (label.includes('operacion realizada') || label.includes('operación realizada')) {
      fields.operationType = value;
    } else if (label.includes('tipo de envio') || label.includes('tipo de envío')) {
      fields.sendingType = value;
    } else if (label.includes('pagado a')) {
      const match = value.match(/(\d{4})$/);
      if (match) {
        fields.cardLast4 = match[1];
      }
      const merchantValue = value.replace(/(\d{4})$/, '').trim();
      fields.merchant = sanitizeMerchantName(merchantValue) || fields.merchant;
    } else if (label.includes('tipo de pago')) {
      fields.paymentType = value;
    } else if (
      label.includes('numero de tarjeta de debito')
      || label.includes('número de tarjeta de débito')
      || label.includes('tarjeta')
    ) {
      const match = value.match(/(\d{4})$/);
      if (match) {
        fields.cardLast4 = match[1];
      }
    } else if (label.includes('empresa') || label.includes('comercio')) {
      fields.merchant = sanitizeMerchantName(value) || fields.merchant;
    } else if (label.includes('servicio')) {
      if (label.includes('titular')) {
        fields.serviceHolder = value;
      } else {
        fields.serviceName = value;
      }
    } else if (label.includes('codigo de usuario') || label.includes('código de usuario') || label.includes('codigo de cliente')) {
      fields.serviceCode = value;
    }
  });

  if (!fields.amountInfo) {
    $('b, strong').each((_, el) => {
      const text = $(el).text();
      const info = extractAmountAndCurrency(text);
      if (info) {
        fields.amountInfo = info;
        return false;
      }
      return undefined;
    });
  }

  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

module.exports = {
  extractFromHtml,
};
