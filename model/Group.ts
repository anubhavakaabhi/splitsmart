import mongoose from "mongoose";

export interface IGroup extends mongoose.Document {
  name: string;
  members?: string[];
  expenses?: number;
  splitType: 'equally' | 'custom';
  expenseTitle: string;
  splits: {person: string, amount: number}[] | null;
  admin: string;
}

const splitSchema = new mongoose.Schema({
  person: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  isPaid:{
    type: Boolean,
    default: false,
  }
}, { _id: false });

export const GroupSchema = new mongoose.Schema<IGroup>({
  name: {type: String},
  members: {type: [String]},
  expenses: {type: Number, default:0},
  expenseTitle: {type: String, default: ""},
  splitType: {type: String, enum:['equally', 'custom'], default:'equally'},
  splits: {type: [splitSchema], default: null},
  admin: {type: String},
});

export const Group = mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);