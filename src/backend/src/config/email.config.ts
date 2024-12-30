/**
 * @fileoverview Email configuration module for SendGrid integration
 * Handles email service settings for transactional emails and system communications
 * @version 1.0.0
 * @requires dotenv ^16.3.1
 */

import { config } from 'dotenv'; // Load environment variables
import { EmailConfig } from '../interfaces/config.interface';
import * as dns from 'dns';
import * as path from 'path';
import * as fs from 'fs';

// Initialize environment variables
config();

// Email Configuration Constants
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.sendgrid.net';
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 587;
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@taskmanager.com';
const EMAIL_RETRY_ATTEMPTS = Number(process.env.EMAIL_RETRY_ATTEMPTS) || 3;
const EMAIL_TEMPLATE_DIR = process.env.EMAIL_TEMPLATE_DIR || 'templates/email';

/**
 * Validates email configuration settings with enhanced security checks
 * @throws {Error} If validation fails with specific error message
 * @returns {boolean} True if configuration is valid
 */
export const validateEmailConfig = (): boolean => {
  // Validate SendGrid API Key
  if (!SENDGRID_API_KEY || !/^SG\.[\w-]{22}\.[\w-]{43}$/.test(SENDGRID_API_KEY)) {
    throw new Error('Invalid or missing SendGrid API key');
  }

  // Validate Email Host
  return new Promise<boolean>((resolve, reject) => {
    dns.lookup(EMAIL_HOST, (err) => {
      if (err) {
        reject(new Error(`Invalid email host: ${EMAIL_HOST}`));
      }
      
      // Validate Email Port
      if (!Number.isInteger(EMAIL_PORT) || EMAIL_PORT < 1 || EMAIL_PORT > 65535) {
        reject(new Error('Invalid email port number'));
      }

      // Validate From Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(EMAIL_FROM)) {
        reject(new Error('Invalid from email address format'));
      }

      // Validate Retry Attempts
      if (!Number.isInteger(EMAIL_RETRY_ATTEMPTS) || EMAIL_RETRY_ATTEMPTS < 1) {
        reject(new Error('Invalid retry attempts value'));
      }

      // Validate Template Directory
      const templatePath = path.resolve(process.cwd(), EMAIL_TEMPLATE_DIR);
      if (!fs.existsSync(templatePath)) {
        reject(new Error('Email template directory not found'));
      }

      resolve(true);
    });
  });
};

/**
 * Email configuration object implementing EmailConfig interface
 * Provides comprehensive email service settings with security and reliability features
 */
export const emailConfig: EmailConfig = {
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: 'apikey', // SendGrid requires 'apikey' as the username
    pass: SENDGRID_API_KEY
  },
  from: EMAIL_FROM,
  templateDir: EMAIL_TEMPLATE_DIR,
  retryAttempts: EMAIL_RETRY_ATTEMPTS
};

/**
 * Validate configuration on module load
 * Throws error if validation fails
 */
try {
  validateEmailConfig();
} catch (error) {
  console.error('Email configuration validation failed:', error.message);
  process.exit(1);
}

// Export validated email configuration
export default emailConfig;