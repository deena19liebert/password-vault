import { authenticator } from 'otplib';
import QRCode from 'qrcode';

authenticator.options = {
  window: 1,
  step: 30
};

export class TwoFactorService {
  /**
   * Generate a new 2FA secret for a user
   */
  static generateSecret(email: string): { secret: string; uri: string } {
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(email, 'SecureVault', secret);
    
    return { secret, uri };
  }

  /**
   * Generate QR code for 2FA setup
   */
  static async generateQRCode(uri: string): Promise<string> {
    return QRCode.toDataURL(uri);
  }

  /**
   * Verify 2FA token
   */
  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}