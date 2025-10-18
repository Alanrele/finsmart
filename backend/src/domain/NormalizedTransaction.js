const { z } = require('zod');

const AmountSchema = z.object({
  value: z.string(),
  currency: z.enum(['PEN', 'USD']),
});

const CardPaymentDetailsSchema = z.object({
  amount: AmountSchema.optional(),
  date: z.string().optional(),
  cardNumber: z.string().optional(),
  merchant: z.string().optional(),
  operationId: z.string().optional(),
});

const ServicePaymentDetailsSchema = z.object({
  company: z.string().optional(),
  service: z.string().optional(),
  serviceHolder: z.string().optional(),
  userCode: z.string().optional(),
  originAccount: z.string().optional(),
  operation: z.string().optional(),
});

const DigitalTransferDetailsSchema = z.object({
  amountSent: AmountSchema.optional(),
  commission: AmountSchema.optional(),
  totalCharged: AmountSchema.optional(),
  operation: z.string().optional(),
  date: z.string().optional(),
  recipient: z.string().optional(),
  destinationBank: z.string().optional(),
  currency: z.string().optional(),
  sendingType: z.string().optional(),
  origin: z.string().optional(),
});

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
  amount: AmountSchema,
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
  details: z.object({
    cardPayment: CardPaymentDetailsSchema.optional(),
    servicePayment: ServicePaymentDetailsSchema.optional(),
    digitalTransfer: DigitalTransferDetailsSchema.optional(),
  }).optional(),
  confidence: z.number().min(0).max(1),
});

module.exports = {
  AmountSchema,
  CardPaymentDetailsSchema,
  ServicePaymentDetailsSchema,
  DigitalTransferDetailsSchema,
  NormalizedTransactionSchema,
};

