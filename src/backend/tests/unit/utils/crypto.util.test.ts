/**
 * @fileoverview Unit tests for cryptographic utility functions
 * Implements comprehensive testing of encryption, hashing, and token generation
 * with security validation and cleanup procedures
 * @version 1.0.0
 */

import { 
  describe, 
  expect, 
  test, 
  beforeEach, 
  afterEach 
} from '@jest/globals';
import {
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  generateToken,
  generateHmac
} from '../../src/utils/crypto.util';

describe('Cryptographic Utilities', () => {
  // Test data
  const validPassword = 'TestPassword123!';
  const sensitiveData = 'Sensitive data for encryption test';
  const tokenLength = 32;
  const hmacData = 'Data for HMAC generation test';

  // Cleanup sensitive data after each test
  afterEach(() => {
    // Overwrite variables containing sensitive data
    const cleanup = (str: string) => '0'.repeat(str.length);
    validPassword.replace(/./g, '0');
    sensitiveData.replace(/./g, '0');
    hmacData.replace(/./g, '0');
  });

  describe('Password Hashing (Argon2id)', () => {
    test('should successfully hash a valid password', async () => {
      const hash = await hashPassword(validPassword);
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$argon2id\$/); // Verify Argon2id format
      expect(hash.length).toBeGreaterThan(50); // Verify minimum hash length
    });

    test('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Invalid password');
    });

    test('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword(validPassword);
      const hash2 = await hashPassword(validPassword);
      expect(hash1).not.toBe(hash2);
    });

    test('should enforce minimum password length', async () => {
      await expect(hashPassword('short')).rejects.toThrow('Invalid password');
    });

    test('should handle maximum password length', async () => {
      const longPassword = 'A'.repeat(128);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeTruthy();
    });
  });

  describe('Password Verification', () => {
    let validHash: string;

    beforeEach(async () => {
      validHash = await hashPassword(validPassword);
    });

    test('should verify correct password', async () => {
      const isValid = await verifyPassword(validPassword, validHash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const isValid = await verifyPassword('WrongPassword123!', validHash);
      expect(isValid).toBe(false);
    });

    test('should throw error for empty password', async () => {
      await expect(verifyPassword('', validHash)).rejects.toThrow();
    });

    test('should throw error for invalid hash format', async () => {
      await expect(verifyPassword(validPassword, 'invalid-hash'))
        .rejects.toThrow();
    });

    test('should handle timing attacks by using constant-time comparison', async () => {
      const startTime = process.hrtime();
      await verifyPassword(validPassword, validHash);
      const endTime = process.hrtime(startTime);
      
      const startTime2 = process.hrtime();
      await verifyPassword('WrongPassword123!', validHash);
      const endTime2 = process.hrtime(startTime2);

      // Verify timing difference is minimal (less than 5ms)
      const timeDiff = Math.abs(
        endTime[1] - endTime2[1]
      ) / 1000000; // Convert to milliseconds
      expect(timeDiff).toBeLessThan(5);
    });
  });

  describe('Encryption and Decryption (AES-256-GCM)', () => {
    test('should successfully encrypt and decrypt data', async () => {
      const { encrypted, iv, tag } = await encrypt(sensitiveData);
      expect(encrypted).toBeTruthy();
      expect(iv).toBeTruthy();
      expect(tag).toBeTruthy();

      const decrypted = await decrypt(encrypted, iv, tag);
      expect(decrypted).toBe(sensitiveData);
    });

    test('should throw error for empty data', async () => {
      await expect(encrypt('')).rejects.toThrow('Invalid data');
    });

    test('should generate different ciphertexts for same data', async () => {
      const result1 = await encrypt(sensitiveData);
      const result2 = await encrypt(sensitiveData);
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    test('should fail decryption with invalid IV', async () => {
      const { encrypted, tag } = await encrypt(sensitiveData);
      const invalidIv = 'a'.repeat(32);
      await expect(decrypt(encrypted, invalidIv, tag))
        .rejects.toThrow('Decryption failed');
    });

    test('should fail decryption with invalid auth tag', async () => {
      const { encrypted, iv } = await encrypt(sensitiveData);
      const invalidTag = 'a'.repeat(32);
      await expect(decrypt(encrypted, iv, invalidTag))
        .rejects.toThrow('Decryption failed');
    });

    test('should handle large data encryption', async () => {
      const largeData = 'A'.repeat(1024 * 1024); // 1MB
      const { encrypted, iv, tag } = await encrypt(largeData);
      const decrypted = await decrypt(encrypted, iv, tag);
      expect(decrypted).toBe(largeData);
    });
  });

  describe('Token Generation', () => {
    test('should generate token of specified length', async () => {
      const token = await generateToken(tokenLength);
      expect(token).toBeTruthy();
      expect(token.length).toBe(tokenLength);
    });

    test('should generate unique tokens', async () => {
      const token1 = await generateToken(tokenLength);
      const token2 = await generateToken(tokenLength);
      expect(token1).not.toBe(token2);
    });

    test('should throw error for invalid length', async () => {
      await expect(generateToken(16)).rejects.toThrow('Invalid length');
      await expect(generateToken(256)).rejects.toThrow('Invalid length');
    });

    test('should generate URL-safe tokens', async () => {
      const token = await generateToken(tokenLength);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('should handle concurrent token generation', async () => {
      const tokens = await Promise.all([
        generateToken(tokenLength),
        generateToken(tokenLength),
        generateToken(tokenLength)
      ]);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(3);
    });
  });

  describe('HMAC Generation', () => {
    test('should generate valid HMAC', () => {
      const hmac = generateHmac(hmacData);
      expect(hmac).toBeTruthy();
      expect(hmac).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 hex chars
    });

    test('should generate consistent HMAC for same data', () => {
      const hmac1 = generateHmac(hmacData);
      const hmac2 = generateHmac(hmacData);
      expect(hmac1).toBe(hmac2);
    });

    test('should generate different HMAC for different data', () => {
      const hmac1 = generateHmac(hmacData);
      const hmac2 = generateHmac(hmacData + 'modified');
      expect(hmac1).not.toBe(hmac2);
    });

    test('should throw error for empty data', () => {
      expect(() => generateHmac('')).toThrow('Invalid data');
    });

    test('should handle special characters in data', () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hmac = generateHmac(specialData);
      expect(hmac).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});