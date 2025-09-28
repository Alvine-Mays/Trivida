import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    paymentIntentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentIntent', index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    receiptNumber: { type: String, unique: true, index: true, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'XAF' },
    months: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    network: { type: String },
    msisdn: { type: String },
    provider: { type: String, default: 'cinetpay' },
    providerRef: { type: String },
    issuedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export type ReceiptDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Receipt = mongoose.model('Receipt', schema);
