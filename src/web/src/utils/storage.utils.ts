import CryptoJS from 'crypto-js'; // v4.1.1 - AES encryption/decryption

// Constants
const STORAGE_PREFIX = 'app_';
const ENCRYPTION_KEY = process.env.VITE_STORAGE_ENCRYPTION_KEY || 'default-key';
const STORAGE_VERSION = '1.0';

// Types
type StorageType = 'localStorage' | 'sessionStorage';
type StorageValue<T> = {
  version: string;
  data: T;
  timestamp: number;
  integrity: string;
};

// Error types
class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Encrypts data using AES-256-GCM encryption with integrity verification
 * @param data - String data to encrypt
 * @returns Encrypted data string with IV and integrity hash
 */
const encrypt = (data: string): string => {
  try {
    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt the data
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7
    });

    // Generate integrity hash
    const integrity = CryptoJS.HmacSHA256(
      encrypted.toString(),
      ENCRYPTION_KEY
    ).toString();

    // Combine IV, encrypted data and integrity hash
    return JSON.stringify({
      iv: iv.toString(),
      data: encrypted.toString(),
      integrity
    });
  } catch (error) {
    throw new StorageError(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypts AES-256-GCM encrypted data with integrity checking
 * @param encryptedData - Encrypted data string with IV and integrity hash
 * @returns Decrypted data string
 */
const decrypt = (encryptedData: string): string => {
  try {
    const { iv, data, integrity } = JSON.parse(encryptedData);

    // Verify integrity
    const calculatedIntegrity = CryptoJS.HmacSHA256(
      data,
      ENCRYPTION_KEY
    ).toString();
    
    if (calculatedIntegrity !== integrity) {
      throw new StorageError('Data integrity check failed');
    }

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new StorageError(`Decryption failed: ${error.message}`);
  }
};

/**
 * Checks available storage quota
 * @param storageType - Type of storage to check
 * @returns Boolean indicating if storage is available
 */
const checkStorageQuota = (storageType: StorageType): boolean => {
  try {
    const storage = window[storageType];
    const testKey = `${STORAGE_PREFIX}quotaTest`;
    const testData = 'x'.repeat(1024 * 1024); // 1MB test
    
    storage.setItem(testKey, testData);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Stores data in browser storage with optional encryption and type safety
 * @param key - Storage key
 * @param value - Value to store
 * @param encrypt - Whether to encrypt the data
 * @param storageType - Type of storage to use
 */
export const setItem = <T>(
  key: string,
  value: T,
  shouldEncrypt = false,
  storageType: StorageType = 'localStorage'
): void => {
  try {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid storage key');
    }

    // Check storage quota
    if (!checkStorageQuota(storageType)) {
      throw new StorageError('Storage quota exceeded');
    }

    const storage = window[storageType];
    const prefixedKey = `${STORAGE_PREFIX}${key}`;

    // Prepare storage value with metadata
    const storageValue: StorageValue<T> = {
      version: STORAGE_VERSION,
      data: value,
      timestamp: Date.now(),
      integrity: ''
    };

    // Serialize and optionally encrypt
    let serializedData = JSON.stringify(storageValue);
    storageValue.integrity = CryptoJS.SHA256(serializedData).toString();
    serializedData = JSON.stringify(storageValue);

    const finalData = shouldEncrypt ? encrypt(serializedData) : serializedData;

    storage.setItem(prefixedKey, finalData);
  } catch (error) {
    throw new StorageError(`Failed to set item: ${error.message}`);
  }
};

/**
 * Retrieves and optionally decrypts data from browser storage with type safety
 * @param key - Storage key
 * @param encrypted - Whether the data is encrypted
 * @param storageType - Type of storage to use
 * @returns Retrieved value with type T or null if not found
 */
export const getItem = <T>(
  key: string,
  encrypted = false,
  storageType: StorageType = 'localStorage'
): T | null => {
  try {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid storage key');
    }

    const storage = window[storageType];
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const data = storage.getItem(prefixedKey);

    if (!data) {
      return null;
    }

    // Decrypt if necessary
    const serializedData = encrypted ? decrypt(data) : data;
    const storageValue: StorageValue<T> = JSON.parse(serializedData);

    // Verify integrity
    const { integrity, ...valueWithoutIntegrity } = storageValue;
    const calculatedIntegrity = CryptoJS.SHA256(
      JSON.stringify(valueWithoutIntegrity)
    ).toString();

    if (calculatedIntegrity !== integrity) {
      throw new StorageError('Data integrity check failed');
    }

    // Version check
    if (storageValue.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch: ${storageValue.version}`);
    }

    return storageValue.data;
  } catch (error) {
    throw new StorageError(`Failed to get item: ${error.message}`);
  }
};

/**
 * Securely removes item from browser storage with cleanup
 * @param key - Storage key
 * @param storageType - Type of storage to use
 */
export const removeItem = (
  key: string,
  storageType: StorageType = 'localStorage'
): void => {
  try {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid storage key');
    }

    const storage = window[storageType];
    const prefixedKey = `${STORAGE_PREFIX}${key}`;

    // Securely overwrite before removal
    storage.setItem(prefixedKey, 'x'.repeat(1024));
    storage.removeItem(prefixedKey);
  } catch (error) {
    throw new StorageError(`Failed to remove item: ${error.message}`);
  }
};

/**
 * Securely clears all app-specific items from storage
 * @param storageType - Type of storage to clear
 */
export const clear = (storageType: StorageType = 'localStorage'): void => {
  try {
    const storage = window[storageType];
    
    // Get all keys with app prefix
    const keys = Object.keys(storage).filter(key => 
      key.startsWith(STORAGE_PREFIX)
    );

    // Securely remove each item
    keys.forEach(key => {
      storage.setItem(key, 'x'.repeat(1024));
      storage.removeItem(key);
    });
  } catch (error) {
    throw new StorageError(`Failed to clear storage: ${error.message}`);
  }
};

// Export types for external use
export type { StorageType, StorageValue, StorageError };