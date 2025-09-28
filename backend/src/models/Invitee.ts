import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', index: true, required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    status: { type: String, enum: ['pending', 'yes', 'no', 'maybe'], default: 'pending' },
    plusOnes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

schema.index({ eventId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

export type InviteeDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Invitee = mongoose.model('Invitee', schema);
