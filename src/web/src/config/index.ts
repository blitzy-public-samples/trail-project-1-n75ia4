/**
 * @fileoverview Central configuration file that exports all application configurations
 * with enhanced security, validation, and type safety.
 * @version 1.0.0
 */

import { apiConfig, apiClient } from './api.config';
import { authConfig } from './auth.config';
import { ThemeConfig, getThemeConfig, applyTheme } from './theme.config';
import { WebSocketConfig } from './websocket.config';
import { AuthProvider, AuthTokenType } from '../types/auth.types';
import { ThemeMode, ColorScheme } from '../constants/theme.constants';

/**
 * Interface for configuration validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface for configuration access tracking
 */
interface ConfigAccess {
  timestamp: number;
  configKey: string;
  accessor: string;
  value: unknown;
}

/**
 * Central configuration manager class
 * Implements comprehensive configuration management with validation and security
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configStore: Map<string, unknown>;
  private accessLog: ConfigAccess[];
  private readonly SENSITIVE_KEYS = ['apiKey', 'secret', 'token', 'password'];

  private constructor() {
    this.configStore = new Map();
    this.accessLog = [];
    this.initializeConfigurations();
  }

  /**
   * Gets singleton instance of ConfigurationManager
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initializes and validates all configurations
   */
  private initializeConfigurations(): void {
    // Initialize with frozen configurations
    this.configStore.set('api', Object.freeze({ ...apiConfig }));
    this.configStore.set('auth', Object.freeze({ ...authConfig }));
    this.configStore.set('theme', Object.freeze(getThemeConfig()));
    this.configStore.set('websocket', Object.freeze({ ...WebSocketConfig }));

    // Validate all configurations
    this.validateConfigurations();
  }

  /**
   * Validates all configuration settings
   */
  public validateConfigurations(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate API configuration
    if (!this.configStore.get('api')) {
      errors.push('API configuration is missing');
    }

    // Validate Auth configuration
    const auth = this.configStore.get('auth') as typeof authConfig;
    if (!auth?.providers?.[AuthProvider.SSO]) {
      warnings.push('SSO provider configuration is missing');
    }

    // Validate WebSocket configuration
    const ws = this.configStore.get('websocket') as typeof WebSocketConfig;
    if (!ws?.WS_URL) {
      errors.push('WebSocket URL is not configured');
    }

    // Validate Theme configuration
    const theme = this.configStore.get('theme') as ThemeConfig;
    if (!theme?.colors) {
      errors.push('Theme colors are not configured');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Retrieves configuration values with access tracking
   */
  public getConfig<T>(key: string): T | null {
    const value = this.configStore.get(key) as T;
    
    // Track configuration access
    this.trackConfigAccess({
      timestamp: Date.now(),
      configKey: key,
      accessor: new Error().stack?.split('\n')[2]?.trim() || 'unknown',
      value: this.maskSensitiveData(key, value)
    });

    return value || null;
  }

  /**
   * Masks sensitive configuration data for logging
   */
  private maskSensitiveData(key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      const maskedObj = { ...value as object };
      Object.keys(maskedObj).forEach(k => {
        if (this.SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk))) {
          maskedObj[k] = '********';
        }
      });
      return maskedObj;
    }
    return this.SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk)) 
      ? '********' 
      : value;
  }

  /**
   * Tracks configuration access for auditing
   */
  private trackConfigAccess(access: ConfigAccess): void {
    this.accessLog.push(access);
    // Maintain last 1000 access logs
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();

// Export validated configurations
export {
  apiConfig,
  apiClient,
  authConfig,
  WebSocketConfig,
  getThemeConfig,
  applyTheme
};

// Export configuration types
export type {
  ThemeConfig,
  ValidationResult,
  ConfigAccess
};

// Export configuration enums
export {
  AuthProvider,
  AuthTokenType,
  ThemeMode,
  ColorScheme
};