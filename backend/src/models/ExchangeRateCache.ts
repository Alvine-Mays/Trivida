import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    base: { type: String, required: true },
    target: { type: String, required: true },
    rate: { type: Number, required: true },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

schema.index({ base: 1, target: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ExchangeRateCacheDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const ExchangeRateCache = mongoose.model('ExchangeRateCache', schema);
