import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    jti: { type: String, unique: true, index: true, required: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    ip: { type: String },
    revoked: { type: Boolean, default: false },
    replacedByJti: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Session = mongoose.model('Session', schema);
