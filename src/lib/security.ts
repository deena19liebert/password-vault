import crypto from 'crypto';
import CryptoJS from 'crypto-js';

export class SecurityService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  /**
   * Derive encryption key from master password using PBKDF2
   */
  static deriveKey(masterPassword: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      masterPassword,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypt data with authenticated encryption
   */
  static encrypt(data: string, masterPassword: string): { 
    encrypted: string; 
    salt: string; 
    iv: string;
    authTag: string;
  } {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = this.deriveKey(masterPassword, salt);
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data with authentication verification
   */
  static decrypt(
    encryptedData: string, 
    masterPassword: string, 
    salt: string, 
    iv: string,
    authTag: string
  ): string {
    const saltBuffer = Buffer.from(salt, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    const encryptedBuffer = Buffer.from(encryptedData, 'hex');
    
    const key = this.deriveKey(masterPassword, saltBuffer);
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);
    
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }

  /**
   * Generate cryptographically secure random password
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  /**
   * Hash data for integrity verification
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure token for refresh tokens
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}

export class ClientEncryption {
  private static readonly KEY_SIZE = 256;
  private static readonly ITERATIONS = 100000;

  /**
   * Client-side encryption using CryptoJS (for browser)
   */
  static encrypt(data: string, masterPassword: string): { 
    encrypted: string;
    salt: string;
    iv: string;
  } {
    const salt = CryptoJS.lib.WordArray.random(128/8).toString();
    const iv = CryptoJS.lib.WordArray.random(128/8).toString();
    
    const key = CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: this.KEY_SIZE / 32,
      iterations: this.ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });
    
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });

    return {
      encrypted: encrypted.toString(),
      salt,
      iv
    };
  }

  /**
   * Client-side decryption using CryptoJS (for browser)
   */
  static decrypt(encryptedData: string, masterPassword: string, salt: string, iv: string): string {
    const key = CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: this.KEY_SIZE / 32,
      iterations: this.ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Calculate password strength score (0-100)
   */
  static calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Length
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;
    
    // Entropy calculation
    const charSetSize = (
      (/[a-z]/.test(password) ? 26 : 0) +
      (/[A-Z]/.test(password) ? 26 : 0) +
      (/[0-9]/.test(password) ? 10 : 0) +
      (/[^a-zA-Z0-9]/.test(password) ? 32 : 0)
    );

    if (charSetSize > 0) {
      const entropy = password.length * Math.log2(charSetSize);
      if (entropy > 100) score += 20;
      else if (entropy > 80) score += 15;
      else if (entropy > 60) score += 10;
      else if (entropy > 40) score += 5;
    }
    
    return Math.min(score, 100);
  }
}