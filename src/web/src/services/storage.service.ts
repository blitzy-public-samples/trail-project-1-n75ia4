import CryptoJS from 'crypto-js'; // v4.1.1 - Advanced encryption operations
import { 
  setItem, 
  getItem, 
  removeItem, 
  clear,
  type StorageType,
  type StorageValue,
  type StorageError 
} from '../utils/storage.utils';

/**
 * Service class providing secure storage operations with enhanced validation,
 * monitoring, and error handling for the task management application.
 */
export class StorageService {
  private storage: StorageType;
  private storageVersion: number;
  private encryptionKeys: {
    current: string;
    previous?: string;
    rotationTimestamp?: number;
  };

  private readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SENSITIVE_FIELDS = ['authToken', 'personalInfo', 'securityPreferences'];
  private readonly METRICS_KEY = 'storage_metrics';

  /**
   * Initializes storage service with specified storage type and sets up encryption
   * @param storageType - Type of storage to use (localStorage/sessionStorage)
   */
  constructor(storageType: StorageType = 'localStorage') {
    this.storage = storageType;
    this.storageVersion = 1;
    this.encryptionKeys = {
      current: this.generateEncryptionKey(),
      rotationTimestamp: Date.now()
    };
    this.validateStorageAvailability();
    this.initializeMetrics();
  }

  /**
   * Stores encrypted user data with validation and version metadata
   * @param userData - User data to store
   * @throws {StorageError} If validation fails or storage is unavailable
   */
  public async setUserData(userData: any): Promise<void> {
    try {
      this.validateUserData(userData);
      const encryptedData = this.encryptSensitiveFields(userData);
      
      await setItem(
        'userData',
        encryptedData,
        true,
        this.storage
      );

      this.updateMetrics('setUserData');
    } catch (error) {
      this.handleError('Failed to set user data', error);
    }
  }

  /**
   * Retrieves and decrypts user data with version compatibility check
   * @returns Decrypted and validated user data or null
   * @throws {StorageError} If data integrity check fails
   */
  public async getUserData(): Promise<any | null> {
    try {
      const encryptedData = await getItem<any>(
        'userData',
        true,
        this.storage
      );

      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decryptSensitiveFields(encryptedData);
      this.validateDataVersion(decryptedData);
      
      this.updateMetrics('getUserData');
      return decryptedData;
    } catch (error) {
      this.handleError('Failed to get user data', error);
      return null;
    }
  }

  /**
   * Stores encrypted authentication token with enhanced security
   * @param token - Authentication token to store
   * @throws {StorageError} If token validation fails
   */
  public async setAuthToken(token: string): Promise<void> {
    try {
      this.validateAuthToken(token);
      
      const encryptedToken = {
        value: token,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
        fingerprint: this.generateFingerprint()
      };

      await setItem(
        'authToken',
        encryptedToken,
        true,
        this.storage
      );

      this.updateMetrics('setAuthToken');
    } catch (error) {
      this.handleError('Failed to set auth token', error);
    }
  }

  /**
   * Retrieves and validates authentication token
   * @returns Valid auth token or null if expired/invalid
   */
  public async getAuthToken(): Promise<string | null> {
    try {
      const encryptedToken = await getItem<any>(
        'authToken',
        true,
        this.storage
      );

      if (!encryptedToken || Date.now() > encryptedToken.expiresAt) {
        return null;
      }

      if (encryptedToken.fingerprint !== this.generateFingerprint()) {
        throw new Error('Invalid token fingerprint');
      }

      this.updateMetrics('getAuthToken');
      return encryptedToken.value;
    } catch (error) {
      this.handleError('Failed to get auth token', error);
      return null;
    }
  }

  /**
   * Securely clears all application data with logging
   */
  public async clearStorage(): Promise<void> {
    try {
      // Securely clear encryption keys
      this.encryptionKeys = {
        current: this.generateEncryptionKey(),
        rotationTimestamp: Date.now()
      };

      await clear(this.storage);
      this.updateMetrics('clearStorage');
    } catch (error) {
      this.handleError('Failed to clear storage', error);
    }
  }

  /**
   * Performs periodic encryption key rotation
   * @throws {StorageError} If key rotation fails
   */
  public async rotateEncryptionKeys(): Promise<void> {
    try {
      const newKey = this.generateEncryptionKey();
      const oldKey = this.encryptionKeys.current;

      // Store old key temporarily for re-encryption
      this.encryptionKeys = {
        current: newKey,
        previous: oldKey,
        rotationTimestamp: Date.now()
      };

      // Re-encrypt all sensitive data with new key
      const userData = await this.getUserData();
      if (userData) {
        await this.setUserData(userData);
      }

      const authToken = await this.getAuthToken();
      if (authToken) {
        await this.setAuthToken(authToken);
      }

      // Remove old key after re-encryption
      delete this.encryptionKeys.previous;
      this.updateMetrics('keyRotation');
    } catch (error) {
      this.handleError('Failed to rotate encryption keys', error);
    }
  }

  /**
   * Validates storage availability and configuration
   * @private
   */
  private validateStorageAvailability(): void {
    try {
      const testKey = 'storage_test';
      setItem(testKey, 'test', false, this.storage);
      removeItem(testKey, this.storage);
    } catch (error) {
      throw new Error(`Storage not available: ${error.message}`);
    }
  }

  /**
   * Validates user data structure and content
   * @private
   */
  private validateUserData(userData: any): void {
    if (!userData || typeof userData !== 'object') {
      throw new Error('Invalid user data format');
    }

    // Add additional validation rules based on data structure
    const requiredFields = ['id', 'email', 'preferences'];
    requiredFields.forEach(field => {
      if (!(field in userData)) {
        throw new Error(`Missing required field: ${field}`);
      }
    });
  }

  /**
   * Validates authentication token format and content
   * @private
   */
  private validateAuthToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }

    // JWT format validation
    const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    if (!jwtRegex.test(token)) {
      throw new Error('Invalid JWT format');
    }
  }

  /**
   * Encrypts sensitive fields in user data
   * @private
   */
  private encryptSensitiveFields(data: any): any {
    const encrypted = { ...data };
    this.SENSITIVE_FIELDS.forEach(field => {
      if (field in encrypted) {
        encrypted[field] = CryptoJS.AES.encrypt(
          JSON.stringify(encrypted[field]),
          this.encryptionKeys.current
        ).toString();
      }
    });
    return encrypted;
  }

  /**
   * Decrypts sensitive fields in user data
   * @private
   */
  private decryptSensitiveFields(data: any): any {
    const decrypted = { ...data };
    this.SENSITIVE_FIELDS.forEach(field => {
      if (field in decrypted) {
        const bytes = CryptoJS.AES.decrypt(
          decrypted[field],
          this.encryptionKeys.current
        );
        decrypted[field] = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      }
    });
    return decrypted;
  }

  /**
   * Generates secure encryption key
   * @private
   */
  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Generates browser fingerprint for token binding
   * @private
   */
  private generateFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width,
      screen.height
    ].join('|');
    return CryptoJS.SHA256(components).toString();
  }

  /**
   * Updates storage metrics
   * @private
   */
  private async updateMetrics(operation: string): Promise<void> {
    try {
      const metrics = await getItem(this.METRICS_KEY, false, this.storage) || {
        operations: {},
        lastUpdate: Date.now()
      };

      metrics.operations[operation] = (metrics.operations[operation] || 0) + 1;
      metrics.lastUpdate = Date.now();

      await setItem(this.METRICS_KEY, metrics, false, this.storage);
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  }

  /**
   * Initializes storage metrics
   * @private
   */
  private async initializeMetrics(): Promise<void> {
    try {
      const metrics = await getItem(this.METRICS_KEY, false, this.storage);
      if (!metrics) {
        await setItem(this.METRICS_KEY, {
          operations: {},
          lastUpdate: Date.now()
        }, false, this.storage);
      }
    } catch (error) {
      console.error('Failed to initialize metrics:', error);
    }
  }

  /**
   * Handles and logs storage errors
   * @private
   */
  private handleError(message: string, error: any): never {
    const errorMessage = `${message}: ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Validates data version compatibility
   * @private
   */
  private validateDataVersion(data: any): void {
    const dataVersion = data?.version || 1;
    if (dataVersion !== this.storageVersion) {
      console.warn(`Data version mismatch. Expected ${this.storageVersion}, got ${dataVersion}`);
      // Implement version migration logic if needed
    }
  }
}