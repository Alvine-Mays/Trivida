import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['expense', 'income', 'savings'], required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    color: { type: String },
    icon: { type: String },
  },
  { timestamps: true }
);

schema.index({ userId: 1, name: 1 }, { unique: true });

export type FinanceCategoryDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const FinanceCategory = mongoose.model('FinanceCategory', schema);
