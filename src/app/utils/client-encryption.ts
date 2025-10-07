import CryptoJS from 'crypto-js';

export class ClientEncryption {
  private static readonly KEY_SIZE = 256;
  private static readonly ITERATIONS = 100000;

  /**
   * Encrypt data on client side before sending to server
   */
  static encrypt(data: string, masterKey: string): { encrypted: string; salt: string; iv: string } {
    const salt = CryptoJS.lib.WordArray.random(128/8).toString();
    const iv = CryptoJS.lib.WordArray.random(128/8).toString();
    
    const key = CryptoJS.PBKDF2(masterKey, salt, {
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
   * Decrypt data on client side after receiving from server
   */
  static decrypt(encryptedData: string, masterKey: string, salt: string, iv: string): string {
    try {
      const key = CryptoJS.PBKDF2(masterKey, salt, {
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
    } catch (error) {
      throw new Error('Failed to decrypt data - check your master key');
    }
  }

  /**
   * Generate a master key for the user
   */
  static generateMasterKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Hash data for integrity check
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}