import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    name: { type: String, required: true },
    cadence: { type: String, enum: ['weekly', 'monthly'], required: true },
    targetAmountMinor: { type: Number, required: true },
    currency: { type: String, default: 'XAF' },
    startDate: { type: Date, required: true },
    annualInterestRate: { type: Number },
    autoRemind: { type: Boolean, default: true },
    nextReminderAt: { type: Date },
  },
  { timestamps: true }
);

// Index userId déjà défini via { index: true } sur le champ — pas besoin de le redéclarer

export type SavingsPlanDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const SavingsPlan = mongoose.model('SavingsPlan', schema);
