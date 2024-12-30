/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables and client types
 * @version 4.0.0
 */

/**
 * Environment variable interface providing type-safe access to configuration values
 * All properties are readonly to prevent accidental modifications during runtime
 */
interface ImportMetaEnv {
  /** Backend API endpoint URL for service communication */
  readonly VITE_API_URL: string;
  
  /** WebSocket server URL for real-time updates */
  readonly VITE_WS_URL: string;
  
  /** Authentication service URL for user management */
  readonly VITE_AUTH_URL: string;
  
  /** File storage service URL for document management */
  readonly VITE_STORAGE_URL: string;
  
  /** Application deployment environment indicator */
  readonly MODE: 'development' | 'production' | 'staging';
  
  /** Base URL for the application deployment */
  readonly BASE_URL: string;
  
  /** Production mode indicator flag */
  readonly PROD: boolean;
  
  /** Development mode indicator flag */
  readonly DEV: boolean;
}

/**
 * Augments the ImportMeta interface to include environment variables
 * This enables type-safe access via import.meta.env
 */
interface ImportMeta {
  /** Environment variable definitions */
  readonly env: ImportMetaEnv;
}