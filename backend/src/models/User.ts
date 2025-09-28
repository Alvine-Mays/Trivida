import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
    name: { type: String },
    locale: { type: String, enum: ['fr', 'en'], default: 'fr' },
    currency: { type: String, default: 'XAF' },
    passwordHash: { type: String },
    providers: {
      googleId: { type: String },
      appleId: { type: String },
    },
    expoPushTokens: { type: [String], default: [] },
    settings: { type: Object },
    plan: { type: String, enum: ['trial','free','premium'], default: 'trial' },
    trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14*24*3600*1000) },
    trialRemindersSent: {
      d7: { type: Date },
      d3: { type: Date },
      d1: { type: Date },
    },
    premiumUntil: { type: Date },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type UserDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model('User', schema);
