import mongoose from '../db.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    type: { type: String, enum: ['savings_reminder', 'budget_alert', 'event_reminder', 'generic'], required: true },
    message: { type: String, required: true },
    data: { type: Object },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    targetPushToken: { type: String, required: true },
    ticketId: { type: String },
    receiptStatus: { type: String, enum: ['ok', 'error'] },
  },
  { timestamps: true }
);

schema.index({ userId: 1, status: 1 });

export type NotificationDoc = mongoose.InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId };
export const Notification = mongoose.model('Notification', schema);
