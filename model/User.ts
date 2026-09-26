import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  email: string;
  username?: string;
  avatar?: string;
}

export const UserSchema = new mongoose.Schema<IUser>({
  username: {type: String,
    unique: [true , "Username already exists"]
  },
  email: { type: String, required: true, unique: [true , "Email already exists"] },
  avatar: { type: String },
});

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
