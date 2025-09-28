import mongoose from '../db.js';

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    status: { type: String, required: true },
    eventAt: { type: Date },
    raw: { type: Object },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'XAF' },
    provider: { type: String, enum: ['cinetpay','flutterwave','legacy_mobile_money'], default: 'cinetpay' },
    operator: { type: String },
    network: { type: String, enum: ['MTN','AIRTEL'], required: false },
    msisdn: { type: String, required: true },
    months: { type: Number, default: 1 },
    discountPercent: { type: Number, default: 0 },
    status: { type: String, enum: ['INITIATED','PENDING','AWAITING_CUSTOMER_VALIDATION','SUCCESS','FAILED','CANCELED','EXPIRED','REVERSED'], default: 'INITIATED' },
    operatorTransactionId: { type: String },
    providerRef: { type: String },
    providerLink: { type: String },
    processedEventIds: { type: [String], default: [] },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true }
);

export type PaymentIntentDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const PaymentIntent = mongoose.model('PaymentIntent', schema);
