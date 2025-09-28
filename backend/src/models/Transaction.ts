import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCategory', index: true, required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', index: true },
    amountMinor: { type: Number, required: true },
    currency: { type: String, default: 'XAF' },
    date: { type: Date, index: true, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

schema.index({ userId: 1, date: -1, _id: -1 });

export type TransactionDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Transaction = mongoose.model('Transaction', schema);
