const templates = [
  {
    name: 'card_purchase',
    priority: 100,
    subject: [
      /BCP:\s*Realizaste un consumo/i,
      /Realizaste un consumo con tu tarjeta/i,
      /Consumo realizado/i,
    ],
    bodyAnchors: [
      /Monto\s+(?:de\s+)?consumo/i,
      /Tarjeta\s+(?:terminada|n°|no\.?)/i,
      /Comercio/i,
      /Fecha\s+y\s+hora/i,
      /Lugar de consumo/i,
    ],
  },
];

function detectTemplate(subject, body) {
  const normalizedSubject = (subject || '').trim();
  const normalizedBody = (body || '').toLowerCase();

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

