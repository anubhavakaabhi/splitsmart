import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  email: string;
  password?: string;
  avatar?: string;
}

export const UserSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  avatar: { type: String },
});

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
