const { z } = require('zod');

const NormalizedTransactionSchema = z.object({
  source: z.literal('BCP'),
  template: z.enum([
    'card_purchase',
    'online_purchase',
    'atm_withdrawal',
    'account_transfer',
    'incoming_credit',
    'service_payment',
    'fee_commission',
  ]),
  occurredAt: z.string(),
  amount: z.object({
    value: z.string(),
    currency: z.enum(['PEN', 'USD']),
  }),
  exchangeRate: z.object({
    used: z.boolean(),
    rate: z.string().optional(),
  }),
  balanceAfter: z.string().optional(),
  channel: z.string().optional(),
  merchant: z.string().optional(),
  location: z.string().optional(),
  cardLast4: z.string().optional(),
  accountRef: z.string().optional(),
  operationId: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

module.exports = {
  NormalizedTransactionSchema,
};

