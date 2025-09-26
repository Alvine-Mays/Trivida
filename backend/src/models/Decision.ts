import mongoose from '../db.js';

const Factors = new mongoose.Schema(
  {
    budgetImpact: { type: Number, required: true },
    longTermBenefit: { type: Number, required: true },
    urgency: { type: Number, required: true },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true },
    context: { type: String },
    factors: { type: Factors, required: true },
    weatherContext: { type: Object },
    score: { type: Number, required: true },
    recommendation: { type: String },
    chosenOption: { type: String },
    status: { type: String, enum: ['pending', 'decided'], default: 'pending' },
  },
  { timestamps: true }
);

schema.index({ userId: 1, createdAt: -1 });

export type DecisionDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Decision = mongoose.model('Decision', schema);
