import mongoose, { Schema, model, models } from 'mongoose';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  image?: string;
  emailVerified?: Date | null;
  lastSeen?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    emailVerified: { type: Date, default: null },
    lastSeen: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// We check if the model is already compiled to prevent overwrite errors in development mode
const User = models.User || model<IUser>('User', UserSchema);

export default User;
