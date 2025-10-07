import jwt from 'jsonwebtoken';

// Use environment variables with fallbacks for development
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development-only-change-in-production';

// Only throw error in production
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || !JWT_REFRESH_SECRET)) {
  throw new Error('JWT secrets must be defined in environment variables for production');
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export class AuthService {
  // Extend access token to 1 hour for better user experience
  static generateAccessToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'access' },
      JWT_SECRET,
      { expiresIn: '1h' } // Changed from 15m to 1h
    );
  }

  static generateRefreshToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  }

  static generateTokens(userId: string, email: string) {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email)
    };
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}