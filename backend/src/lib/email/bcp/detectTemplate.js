const templates = [
  {
    name: 'card_purchase',
    priority: 120,
    subject: [
      /BCP:\s*Realizaste un consumo/i,
      /Realizaste un consumo con tu tarjeta/i,
      /Realizaste un consumo con tu Tarjeta de Debito BCP/i,
      /Consumo realizado/i,
      /Compra con tu tarjeta/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:de\s+)?consumo/i,
      /Total\s+(?:del\s+)?consumo/i,
      /Tarjeta\s+(?:terminada|numero|N[°º])/i,
      /Comercio/i,
      /Fecha\s+y\s+hora/i,
      /Lugar\s+de\s+consumo/i,
    ],
  },
  {
    name: 'online_purchase',
    priority: 110,
    subject: [
      /Compra\s+por\s+internet/i,
      /Compra\s+online/i,
      /Realizaste\s+una\s+compra\s+online/i,
      /BCP:\s*Compra\s+web/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:de\s+)?compra/i,
      /Tarjeta\s+(?:terminada|numero|N[°º])/i,
      /Comercio/i,
      /Canal:?\s*(?:Banca por Internet|App BCP|Web)/i,
      /Fecha\s+y\s+hora/i,
    ],
  },
  {
    name: 'atm_withdrawal',
    priority: 100,
    subject: [
      /Retiro\s+en\s+cajero/i,
      /Retiro\s+de\s+cajero/i,
      /Retiro\s+BCP/i,
      /BCP:\s*Retiro/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:retirado|de\s+retiro)/i,
      /Cajero/i,
      /Ubicacion/i,
      /Fecha\s+y\s+hora/i,
      /Operacion/i,
    ],
  },
  {
    name: 'account_transfer',
    priority: 95,
    subject: [
      /Constancia\s+de\s+Transferencia/i,
      /Transferencia\s+realizada/i,
      /Transferencia\s+a\s+Otros\s+Bancos/i,
      /Transferencia\s+Entre\s+mis\s+Cuentas/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:transferido|de\s+la\s+operacion)/i,
      /Cuenta\s+origen/i,
      /Cuenta\s+destino/i,
      /Desde/i,
      /Enviado\s+a/i,
      /CCI/i,
      /Numero\s+de\s+operacion/i,
      /Fecha\s+y\s+hora/i,
    ],
  },
  {
    name: 'incoming_credit',
    priority: 90,
    subject: [
      /Realizamos\s+una\s+devoluc(?:ion|in)/i,
      /Abono\s+recibido/i,
      /Dep(?:osito|sito)\s+realizado(?:\s+en\s+d(?:olares|lares))?/i,
      /Ingreso\s+en\s+tu\s+cuenta/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:abonado|depositado|devuelto)/i,
      /Total\s+devuelto/i,
      /Cuenta\s+destino/i,
      /Origen/i,
      /Motivo/i,
      /Operacion/i,
    ],
  },
  {
    name: 'service_payment',
    priority: 85,
    subject: [
      /(?:Envio\s+Automatico\s*-?\s*)?Constancia\s+de\s+Pago\s+de\s+Servicio/i,
      /Constancia\s+de\s+Pago\s+de\s+Servicio/i,
      /Pago\s+de\s+servicio/i,
      /Pago\s+de\s+servicios/i,
      /Servicio\s+pagado/i,
      /Envio\s+de\s+comprobante\s+de\s+servicio/i,
    ],
    bodyAnchors: [
      /Servicio/i,
      /Monto\s+(?:pago|total)/i,
      /C(?:o)?digo\s+de\s+(?:cliente|usuario)/i,
      /Cuenta\s+origen/i,
      /Titular\s+del\s+servicio/i,
      /Operacion/i,
      /Fecha\s+y\s+hora/i,
    ],
  },
  {
    name: 'fee_commission',
    priority: 80,
    subject: [
      /Cobro\s+de\s+comisi(?:on|n)/i,
      /Cargo\s+por\s+servicio/i,
      /Se\s+ha\s+cargado\s+una\s+comisi(?:on|n)/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:de\s+)?comisi(?:on|n)/i,
      /Motivo\s+del\s+cargo/i,
      /Cuenta\s+afectada/i,
      /Operacion/i,
      /Fecha\s+y\s+hora/i,
    ],
  },
];

function normalizeSubject(subject) {
  return (subject || '')
    .replace(/\uFFFD/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeBody(body) {
  return (body || '')
    .replace(/\uFFFD/g, '')
    .toLowerCase();
}

function detectTemplate(subject, body) {
  const normalizedSubject = normalizeSubject(subject);
  const normalizedBody = normalizeBody(body);

  let winner = null;

  for (const template of templates) {
    const subjectMatched = template.subject.some((regex) => regex.test(normalizedSubject));
    if (!subjectMatched) {
      continue;
    }

    const anchorMatches = template.bodyAnchors.reduce(
      (count, regex) => (regex.test(normalizedBody) ? count + 1 : count),
      0,
    );

    if (anchorMatches < 2) {
      continue;
    }

    const score = {
      template: template.name,
      anchorMatches,
      priority: template.priority || 0,
    };

    if (!winner) {
      winner = score;
      continue;
    }

    if (anchorMatches > winner.anchorMatches) {
      winner = score;
    } else if (anchorMatches === winner.anchorMatches && score.priority > winner.priority) {
      winner = score;
    }
  }

  return winner;
}

module.exports = {
  detectTemplate,
  templates,
};
