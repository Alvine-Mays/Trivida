import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    name: { type: String, required: true },
    description: { type: String },
    currency: { type: String, default: 'XAF' },
  },
  { timestamps: true }
);

schema.index({ userId: 1, name: 1 }, { unique: true });

export type BusinessDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Business = mongoose.model('Business', schema);
