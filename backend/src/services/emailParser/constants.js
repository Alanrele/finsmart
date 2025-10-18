const FALLBACK_SENDERS = new Set([
  'notificaciones@notificacionesbcp.com.pe',
  'notificaciones@bcp.com.pe',
  'alertas@bcp.com.pe',
  'movimientos@bcp.com.pe',
  'bcp@bcp.com.pe',
]);

const TRANSACTIONAL_HINTS = [
  /monto/i,
  /consumo/i,
  /transferencia/i,
  /abono/i,
  /retiro/i,
  /pago/i,
  /n[uǧ]mero\s+de\s+operaci[o��]n/i,
];

const TEMPLATE_TYPE_MAP = {
  card_purchase: 'debit',
  online_purchase: 'debit',
  atm_withdrawal: 'withdrawal',
  account_transfer: 'transfer',
  incoming_credit: 'deposit',
  service_payment: 'payment',
  fee_commission: 'payment',
};

const TEMPLATE_CATEGORY_MAP = {
  card_purchase: 'shopping',
  online_purchase: 'shopping',
  atm_withdrawal: 'other',
  account_transfer: 'transfer',
  incoming_credit: 'income',
  service_payment: 'utilities',
  fee_commission: 'other',
};

const MIN_CONFIDENCE = Number(process.env.PARSER_V2_MIN_CONFIDENCE || '0.7');

module.exports = {
  FALLBACK_SENDERS,
  TRANSACTIONAL_HINTS,
  TEMPLATE_TYPE_MAP,
  TEMPLATE_CATEGORY_MAP,
  MIN_CONFIDENCE,
};
