import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  
  comparePassword(candidatePassword: string): Promise<boolean>;
  addRefreshToken(token: string): Promise<void>;
  removeRefreshToken(token: string): Promise<void>;
  hasRefreshToken(token: string): boolean;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 8
  },
  twoFactorSecret: {
    type: String
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    type: String,
    select: false
  }]
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ updatedAt: -1 });

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.addRefreshToken = async function(token: string): Promise<void> {
  this.refreshTokens.push(token);
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  await this.save();
};

userSchema.methods.removeRefreshToken = async function(token: string): Promise<void> {
  this.refreshTokens = this.refreshTokens.filter((t: string) => t !== token);
  await this.save();
};

userSchema.methods.hasRefreshToken = function(token: string): boolean {
  return this.refreshTokens.includes(token);
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);