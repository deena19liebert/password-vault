import CryptoJS from 'crypto-js';

export class AdvancedEncryption {
  private static algorithm = CryptoJS.AES;
  private static keySize = 256;
  private static ivSize = 128;
  private static iterations = 100000;

  /**
   * Derive a secure key from master password using PBKDF2
   */
  static deriveKey(masterPassword: string, salt: string): string {
    return CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: this.keySize / 32,
      iterations: this.iterations,
      hasher: CryptoJS.algo.SHA256
    }).toString();
  }

  /**
   * Encrypt data with authenticated encryption
   */
  static encrypt(data: string, masterPassword: string): { encrypted: string; salt: string; iv: string } {
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const iv = CryptoJS.lib.WordArray.random(128 / 8).toString();
    
    const key = this.deriveKey(masterPassword, salt);
    
    const encrypted = this.algorithm.encrypt(data, key, {
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
   * Decrypt data with verification
   */
  static decrypt(encryptedData: string, masterPassword: string, salt: string, iv: string): string {
    try {
      const key = this.deriveKey(masterPassword, salt);
      
      const decrypted = this.algorithm.decrypt(encryptedData, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Decryption failed - possible tampering or wrong key');
    }
  }

  /**
   * Generate cryptographically secure random string
   */
  static generateRandomKey(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Hash data for integrity verification
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}