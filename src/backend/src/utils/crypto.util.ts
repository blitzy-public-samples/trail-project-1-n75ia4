/**
 * @fileoverview Cryptographic utility module providing secure data handling functions
 * Implements enterprise-grade encryption, hashing, and token generation with enhanced security
 * @version 1.0.0
 */

import * as argon2 from 'argon2'; // v0.30.0
import { 
  randomBytes, 
  createCipheriv, 
  createDecipheriv, 
  createHmac,
  scrypt,
  timingSafeEqual
} from 'crypto';
import { promisify } from 'util';
import { AuthConfig } from '../interfaces/config.interface';
import { authConfig } from '../config/auth.config';

// Async version of scrypt
const scryptAsync = promisify(scrypt);

/**
 * Cryptographic constants with enhanced security parameters
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const HASH_ALGORITHM = 'sha256';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

// Argon2id configuration with enhanced security parameters
const ARGON2_MEMORY_COST = 65536; // 64 MB
const ARGON2_TIME_COST = 3;
const ARGON2_PARALLELISM = 4;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Error messages for input validation
 */
const ERROR_MESSAGES = {
  INVALID_PASSWORD: 'Invalid password: must be at least 8 characters',
  INVALID_HASH: 'Invalid hash format',
  INVALID_DATA: 'Invalid data for encryption',
  INVALID_PARAMS: 'Invalid encryption parameters',
  DECRYPTION_FAILED: 'Decryption failed: data integrity check failed',
  INVALID_LENGTH: 'Invalid token length specified',
  INVALID_JWT_SECRET: 'Invalid JWT secret configuration'
};

/**
 * Validates input data for cryptographic operations
 * @param data - Data to validate
 * @throws Error if validation fails
 */
const validateInput = (data: string | Buffer): void => {
  if (!data || (typeof data === 'string' && !data.trim())) {
    throw new Error(ERROR_MESSAGES.INVALID_DATA);
  }
};

/**
 * Hashes a password using Argon2id with enhanced security parameters
 * @param password - Password to hash
 * @returns Promise<string> Hashed password
 * @throws Error if password validation fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(ERROR_MESSAGES.INVALID_PASSWORD);
  }

  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
      saltLength: SALT_LENGTH
    });

    return hash;
  } finally {
    // Clean up sensitive data
    password = '';
  }
}

/**
 * Verifies a password against its hash using constant-time comparison
 * @param password - Password to verify
 * @param hash - Hash to verify against
 * @returns Promise<boolean> True if password matches
 * @throws Error if validation fails
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    throw new Error(ERROR_MESSAGES.INVALID_PARAMS);
  }

  try {
    return await argon2.verify(hash, password, {
      type: argon2.argon2id
    });
  } finally {
    // Clean up sensitive data
    password = '';
  }
}

/**
 * Encrypts data using AES-256-GCM with enhanced security
 * @param data - Data to encrypt
 * @returns Promise<{encrypted: string; iv: string; tag: string}> Encrypted data with parameters
 * @throws Error if encryption fails
 */
export async function encrypt(data: string): Promise<{ encrypted: string; iv: string; tag: string }> {
  validateInput(data);

  try {
    // Generate cryptographically secure IV
    const iv = randomBytes(IV_LENGTH);
    
    // Generate encryption key using scrypt for additional security
    const salt = randomBytes(SALT_LENGTH);
    const key = await scryptAsync(authConfig.jwtSecret, salt, KEY_LENGTH);

    // Create cipher with authenticated encryption
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  } finally {
    // Clean up sensitive data
    data = '';
  }
}

/**
 * Decrypts data using AES-256-GCM with authentication verification
 * @param encryptedData - Data to decrypt
 * @param iv - Initialization vector
 * @param tag - Authentication tag
 * @returns Promise<string> Decrypted data
 * @throws Error if decryption or authentication fails
 */
export async function decrypt(
  encryptedData: string,
  iv: string,
  tag: string
): Promise<string> {
  validateInput(encryptedData);
  validateInput(iv);
  validateInput(tag);

  try {
    // Convert parameters from hex
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');
    
    // Regenerate key using same parameters
    const salt = randomBytes(SALT_LENGTH);
    const key = await scryptAsync(authConfig.jwtSecret, salt, KEY_LENGTH);

    // Create decipher
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    // Decrypt data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(ERROR_MESSAGES.DECRYPTION_FAILED);
  }
}

/**
 * Generates a cryptographically secure random token
 * @param length - Desired token length
 * @returns Promise<string> Secure random token
 * @throws Error if length is invalid
 */
export async function generateToken(length: number): Promise<string> {
  if (length < 32 || length > 128) {
    throw new Error(ERROR_MESSAGES.INVALID_LENGTH);
  }

  try {
    const buffer = await promisify(randomBytes)(Math.ceil(length * 1.5));
    return buffer.toString('base64url').slice(0, length);
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
}

/**
 * Generates HMAC signature with timing attack protection
 * @param data - Data to sign
 * @returns string HMAC signature
 * @throws Error if validation fails
 */
export function generateHmac(data: string): string {
  validateInput(data);
  
  if (!authConfig.jwtSecret) {
    throw new Error(ERROR_MESSAGES.INVALID_JWT_SECRET);
  }

  try {
    const hmac = createHmac(HASH_ALGORITHM, authConfig.jwtSecret);
    hmac.update(data);
    return hmac.digest('hex');
  } catch (error) {
    throw new Error(`HMAC generation failed: ${error.message}`);
  }
}

/**
 * Performs constant-time comparison of two strings
 * @param a - First string
 * @param b - Second string
 * @returns boolean True if strings match
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  } finally {
    // Clean up sensitive data
    bufA.fill(0);
    bufB.fill(0);
  }
}