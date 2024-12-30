/**
 * @fileoverview Comprehensive unit tests for AuthService implementation
 * @version 1.0.0
 */

// External imports - versions from technical specification
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // ^29.0.0
import RedisMock from 'ioredis-mock'; // ^8.0.0
import jwt from 'jsonwebtoken'; // ^9.0.0
import * as argon2 from 'argon2'; // ^0.31.0

// Internal imports
import { AuthService } from '../../src/services/auth.service';
import { User } from '../../src/models/user.model';
import {
  AuthProvider,
  AuthTokenType,
  AuthError,
  MFAConfig
} from '../../src/types/auth.types';
import { UserRole, UserStatus } from '../../src/types/user.types';

// Mock implementations
jest.mock('../../src/models/user.model');
jest.mock('rate-limiter-flexible');

describe('AuthService', () => {
  // Service instances
  let authService: AuthService;
  let redisClient: RedisMock;
  
  // Mocked dependencies
  let rateLimiterMock: jest.Mock;
  let mfaServiceMock: jest.Mock;
  let tokenServiceMock: jest.Mock;
  let sessionServiceMock: jest.Mock;

  // Test data
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'hashed_password',
    role: UserRole.TEAM_MEMBER,
    status: UserStatus.ACTIVE
  };

  const mockDeviceInfo = {
    userAgent: 'test-agent',
    ip: '127.0.0.1',
    screenResolution: '1920x1080'
  };

  const mockMFAConfig: MFAConfig = {
    enabled: true,
    method: 'TOTP',
    verified: true
  };

  beforeEach(() => {
    // Initialize mocks
    redisClient = new RedisMock();
    rateLimiterMock = jest.fn();
    mfaServiceMock = {
      getUserMFAConfig: jest.fn(),
      initiateMFAChallenge: jest.fn(),
      validateMFAChallenge: jest.fn()
    };
    tokenServiceMock = {
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
      cleanupBlacklistedTokens: jest.fn()
    };
    sessionServiceMock = {
      createSession: jest.fn(),
      validateSession: jest.fn(),
      cleanupExpiredSessions: jest.fn()
    };

    // Initialize service
    authService = new AuthService(
      redisClient,
      rateLimiterMock,
      mfaServiceMock,
      tokenServiceMock,
      sessionServiceMock
    );

    // Setup default mock implementations
    jest.spyOn(User.prototype, 'findByEmail').mockResolvedValue(mockUser);
    jest.spyOn(argon2, 'verify').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('should successfully authenticate with valid credentials', async () => {
      // Setup
      const credentials = {
        email: mockUser.email,
        password: 'valid_password',
        provider: AuthProvider.LOCAL
      };

      mfaServiceMock.getUserMFAConfig.mockResolvedValue({ enabled: false });
      tokenServiceMock.generateToken.mockImplementation((payload, type) => 
        Promise.resolve(type === AuthTokenType.ACCESS ? 'access_token' : 'refresh_token')
      );

      // Execute
      const result = await authService.login(credentials, mockDeviceInfo);

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 900
      });
      expect(User.prototype.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(argon2.verify).toHaveBeenCalledWith(mockUser.password, credentials.password);
      expect(sessionServiceMock.createSession).toHaveBeenCalled();
    });

    test('should initiate MFA when enabled', async () => {
      // Setup
      const credentials = {
        email: mockUser.email,
        password: 'valid_password',
        provider: AuthProvider.LOCAL
      };

      mfaServiceMock.getUserMFAConfig.mockResolvedValue(mockMFAConfig);
      mfaServiceMock.initiateMFAChallenge.mockResolvedValue('mfa_challenge_token');

      // Execute
      const result = await authService.login(credentials, mockDeviceInfo);

      // Assert
      expect(result).toEqual({
        mfaRequired: true,
        mfaToken: 'mfa_challenge_token',
        userId: mockUser.id
      });
      expect(mfaServiceMock.initiateMFAChallenge).toHaveBeenCalledWith(
        mockUser.id,
        mockMFAConfig.method
      );
    });

    test('should handle rate limiting', async () => {
      // Setup
      rateLimiterMock.mockRejectedValue(new Error('RATE_LIMIT_EXCEEDED'));

      // Execute & Assert
      await expect(authService.login({
        email: mockUser.email,
        password: 'valid_password',
        provider: AuthProvider.LOCAL
      }, mockDeviceInfo)).rejects.toThrow('RATE_LIMIT_EXCEEDED');
    });

    test('should handle invalid credentials', async () => {
      // Setup
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      // Execute & Assert
      await expect(authService.login({
        email: mockUser.email,
        password: 'wrong_password',
        provider: AuthProvider.LOCAL
      }, mockDeviceInfo)).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  describe('validateMFA', () => {
    test('should complete authentication after valid MFA verification', async () => {
      // Setup
      const mfaToken = 'valid_mfa_token';
      const verificationCode = '123456';

      mfaServiceMock.validateMFAChallenge.mockResolvedValue(true);
      tokenServiceMock.generateToken.mockImplementation((payload, type) => 
        Promise.resolve(type === AuthTokenType.ACCESS ? 'access_token' : 'refresh_token')
      );

      // Execute
      const result = await authService.validateMFA(
        mockUser.id,
        mfaToken,
        verificationCode,
        mockDeviceInfo
      );

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 900
      });
      expect(mfaServiceMock.validateMFAChallenge).toHaveBeenCalledWith(
        mockUser.id,
        mfaToken,
        verificationCode
      );
      expect(sessionServiceMock.createSession).toHaveBeenCalled();
    });

    test('should handle invalid MFA code', async () => {
      // Setup
      mfaServiceMock.validateMFAChallenge.mockResolvedValue(false);

      // Execute & Assert
      await expect(authService.validateMFA(
        mockUser.id,
        'mfa_token',
        'invalid_code',
        mockDeviceInfo
      )).rejects.toThrow('INVALID_MFA_CODE');
    });
  });

  describe('refreshToken', () => {
    test('should issue new tokens with valid refresh token', async () => {
      // Setup
      const refreshToken = 'valid_refresh_token';
      const tokenPayload = {
        userId: mockUser.id,
        sessionId: 'test-session-id',
        type: AuthTokenType.REFRESH
      };

      tokenServiceMock.verifyToken.mockResolvedValue(tokenPayload);
      sessionServiceMock.validateSession.mockResolvedValue({ id: 'test-session-id' });
      tokenServiceMock.generateToken.mockImplementation((payload, type) => 
        Promise.resolve(type === AuthTokenType.ACCESS ? 'new_access_token' : 'new_refresh_token')
      );

      // Execute
      const result = await authService.refreshToken(refreshToken, mockDeviceInfo);

      // Assert
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 900
      });
      expect(sessionServiceMock.validateSession).toHaveBeenCalledWith(
        'test-session-id',
        mockDeviceInfo
      );
    });

    test('should handle expired refresh token', async () => {
      // Setup
      tokenServiceMock.verifyToken.mockRejectedValue(new Error('TOKEN_EXPIRED'));

      // Execute & Assert
      await expect(authService.refreshToken(
        'expired_token',
        mockDeviceInfo
      )).rejects.toThrow('TOKEN_EXPIRED');
    });
  });

  describe('logout', () => {
    test('should successfully invalidate session and tokens', async () => {
      // Setup
      const sessionId = 'test-session-id';
      sessionServiceMock.revokeSession = jest.fn().mockResolvedValue(undefined);
      tokenServiceMock.revokeToken = jest.fn().mockResolvedValue(undefined);

      // Execute
      await authService.logout(mockUser.id, sessionId);

      // Assert
      expect(sessionServiceMock.revokeSession).toHaveBeenCalledWith(sessionId);
      expect(tokenServiceMock.revokeToken).toHaveBeenCalled();
    });
  });

  describe('handleSSOCallback', () => {
    test('should handle successful SSO authentication', async () => {
      // Setup
      const ssoProfile = {
        id: 'sso-user-id',
        email: 'sso@example.com',
        name: 'SSO User'
      };

      const ssoToken = 'valid_sso_token';
      tokenServiceMock.generateToken.mockImplementation((payload, type) => 
        Promise.resolve(type === AuthTokenType.ACCESS ? 'access_token' : 'refresh_token')
      );

      // Execute
      const result = await authService.handleSSOCallback(ssoToken, mockDeviceInfo);

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 900
      });
      expect(sessionServiceMock.createSession).toHaveBeenCalled();
    });
  });
});