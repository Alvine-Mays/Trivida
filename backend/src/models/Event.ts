import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true },
    dateTime: { type: Date, required: true },
    timeZone: { type: String },
    location: { type: String },
    visibility: { type: String, enum: ['public', 'private'], required: true },
    accessCodeHash: { type: String },
    slug: { type: String, unique: true, index: true, required: true },
    costPerGuestMinor: { type: Number, required: true },
    currency: { type: String, default: 'XAF' },
    allowPlusOnes: { type: Boolean, default: true },
    capacity: { type: Number },
  },
  { timestamps: true }
);

export type EventDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Event = mongoose.model('Event', schema);
