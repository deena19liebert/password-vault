import crypto from 'crypto';

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;
  private static saltLength = 16;
  private static ivLength = 12;
  private static tagLength = 16;

 
  static deriveKey(masterPassword: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      masterPassword,
      salt,
      100000, // iterations
      this.keyLength,
      'sha256'
    );
  }

  
  static encrypt(data: string, masterPassword: string): { 
    encrypted: string; 
    salt: string; 
    iv: string;
    authTag: string;
  } {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(masterPassword, salt);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Use type assertion for getAuthTag
      const authTag = (cipher as any).getAuthTag();
      
      if (!authTag || authTag.length !== this.tagLength) {
        throw new Error('Authentication tag generation failed');
      }
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(
    encryptedData: string, 
    masterPassword: string, 
    salt: string, 
    iv: string, 
    authTag: string
  ): string {
    try {
      const saltBuffer = Buffer.from(salt, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');
      
      if (saltBuffer.length !== this.saltLength || 
          ivBuffer.length !== this.ivLength || 
          authTagBuffer.length !== this.tagLength) {
        throw new Error('Invalid encryption parameters');
      }
      
      const key = this.deriveKey(masterPassword, saltBuffer);
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
      (decipher as any).setAuthTag(authTagBuffer);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt and package data for storage
   */
  static encryptForStorage(data: string, masterPassword: string): string {
    const { encrypted, salt, iv, authTag } = this.encrypt(data, masterPassword);
    
    // Package all components into a single string
    const packaged = JSON.stringify({
      e: encrypted, // encrypted data
      s: salt,      // salt
      i: iv,        // initialization vector
      t: authTag    // authentication tag
    });
    
    return Buffer.from(packaged).toString('base64');
  }

  /**
   * Decrypt data from storage package
   */
  static decryptFromStorage(encryptedPackage: string, masterPassword: string): string {
    try {
      const packaged = JSON.parse(Buffer.from(encryptedPackage, 'base64').toString('utf8'));
      
      if (!packaged.e || !packaged.s || !packaged.i || !packaged.t) {
        throw new Error('Invalid encrypted package format');
      }
      
      return this.decrypt(packaged.e, masterPassword, packaged.s, packaged.i, packaged.t);
    } catch (error) {
      throw new Error(`Failed to decrypt package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a random encryption key for testing
   */
  static generateRandomKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Generate a cryptographically secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const randomValues = new Uint32Array(length);
    
    crypto.randomFillSync(randomValues);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
    
    return password;
  }

  /**
   * Verify if data can be decrypted (integrity check)
   */
  static verifyEncryption(data: string, masterPassword: string, salt: string, iv: string, authTag: string): boolean {
    try {
      this.decrypt(data, masterPassword, salt, iv, authTag);
      return true;
    } catch {
      return false;
    }
  }
}

// Alternative simplified version without getAuthTag issues
export class SimpleEncryptionService {
  private static algorithm = 'aes-256-cbc';
  private static keyLength = 32;
  private static ivLength = 16;

  static deriveKey(masterPassword: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      masterPassword,
      salt,
      100000,
      this.keyLength,
      'sha256'
    );
  }

  static encrypt(data: string, masterPassword: string): { encrypted: string; salt: string; iv: string } {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.deriveKey(masterPassword, salt);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  static decrypt(encryptedData: string, masterPassword: string, salt: string, iv: string): string {
    const saltBuffer = Buffer.from(salt, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const key = this.deriveKey(masterPassword, saltBuffer);
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}