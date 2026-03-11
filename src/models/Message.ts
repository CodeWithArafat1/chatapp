import mongoose, { Schema, model, models } from 'mongoose';

export interface IMessage {
  _id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Add indexes for efficient querying of chat histories between two users
MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ timestamp: 1 });

const Message = models.Message || model<IMessage>('Message', MessageSchema);

export default Message;
