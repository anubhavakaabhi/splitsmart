import mongoose from "mongoose";

export interface IGroup extends mongoose.Document {
  name: string;
  members?: string[];
  expenses?: number;
  admin: string;
}

export const GroupSchema = new mongoose.Schema<IGroup>({
  name: {type: String},
  members: {type: [String]},
  expenses: {type: Number, default:0},
  admin: {type: String},
});

export const Group = mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);