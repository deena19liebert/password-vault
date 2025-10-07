import mongoose, { Document, Schema } from 'mongoose';

export interface IVaultItem extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  username: string;
  encryptedPassword: string;
  encryptedNotes?: string;
  url?: string;
  tags: string[];
  category: string;
  favorite: boolean;
  strength: number;
  lastAccessed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vaultItemSchema = new Schema<IVaultItem>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  encryptedPassword: {
    type: String,
    required: true
  },
  encryptedNotes: {
    type: String
  },
  url: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  category: {
    type: String,
    default: 'General',
    index: true
  },
  favorite: {
    type: Boolean,
    default: false,
    index: true
  },
  strength: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastAccessed: {
    type: Date
  }
}, {
  timestamps: true
});


vaultItemSchema.index({ userId: 1, category: 1 });
vaultItemSchema.index({ userId: 1, favorite: -1 });
vaultItemSchema.index({ userId: 1, tags: 1 });
vaultItemSchema.index({ userId: 1, updatedAt: -1 });
vaultItemSchema.index({ userId: 1, title: 'text', username: 'text' });

export const VaultItem = mongoose.models.VaultItem || mongoose.model<IVaultItem>('VaultItem', vaultItemSchema);