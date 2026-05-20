import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface ILead extends Document {
  name: string;
  email: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  source: 'Website' | 'Instagram' | 'Referral';
  createdBy: IUser['_id'];
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Lost'],
      default: 'New'
    },
    source: {
      type: String,
      enum: ['Website', 'Instagram', 'Referral'],
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Add text index for search
LeadSchema.index({ name: 'text', email: 'text' });

export default mongoose.model<ILead>('Lead', LeadSchema);
