import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    payload: { type: Object, required: true },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

schema.index({ key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type TimezoneCacheDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const TimezoneCache = mongoose.model('TimezoneCache', schema);
