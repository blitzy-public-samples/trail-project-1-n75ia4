/**
 * @fileoverview Enhanced authentication service implementation with comprehensive security features
 * @version 1.0.0
 * @module services/auth
 */

// External imports
import Redis from 'ioredis'; // ^5.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import { hash, verify } from 'argon2'; // ^0.30.3
import jwt from 'jsonwebtoken'; // ^9.0.0
import crypto from 'crypto';

// Internal imports
import { 
  IAuthService, 
  ITokenService, 
  ISessionService, 
  IMFAService 
} from '../interfaces/auth.interface';
import {
  AuthTokenType,
  AuthProvider,
  TokenPayload,
  AuthTokens,
  AuthCredentials,
  AuthSession,
  AuthError,
  MFAConfig
} from '../types/auth.types';
import { UserStatus, UserRole } from '../types/user.types';

/**
 * Enhanced authentication service implementation with comprehensive security features
 * Implements secure authentication flows with MFA, device binding, and session management
 */
export class AuthService implements IAuthService {
  private readonly TOKEN_EXPIRY = {
    [AuthTokenType.ACCESS]: '15m',
    [AuthTokenType.REFRESH]: '7d'
  };

  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes
  private readonly SESSION_CLEANUP_INTERVAL = 3600000; // 1 hour

  constructor(
    private readonly redisClient: Redis,
    private readonly rateLimiter: RateLimiterRedis,
    private readonly mfaService: IMFAService,
    private readonly tokenService: ITokenService,
    private readonly sessionService: ISessionService
  ) {
    // Initialize cleanup job for expired sessions and blacklisted tokens
    this.initializeCleanupJob();
  }

  /**
   * Enhanced login with MFA support, device binding, and security checks
   * @param credentials User authentication credentials
   * @param deviceInfo Client device information for fingerprinting
   * @returns Authentication response with tokens and MFA status
   * @throws AuthError on validation failure or security violations
   */
  public async login(
    credentials: AuthCredentials,
    deviceInfo: DeviceInfo
  ): Promise<AuthTokens> {
    try {
      // Rate limiting check
      await this.checkRateLimit(credentials.email);

      // Validate credentials format
      this.validateCredentialsFormat(credentials);

      // Retrieve user and verify status
      const user = await this.getUserByEmail(credentials.email);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Verify password with Argon2id
      if (credentials.provider === AuthProvider.LOCAL) {
        const isValid = await verify(user.password, credentials.password);
        if (!isValid) {
          await this.handleFailedLogin(credentials.email);
          throw new Error('INVALID_CREDENTIALS');
        }
      }

      // Generate device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);

      // Check for MFA requirement
      const mfaConfig = await this.mfaService.getUserMFAConfig(user.id);
      if (mfaConfig.enabled) {
        const mfaToken = await this.mfaService.initiateMFAChallenge(
          user.id,
          mfaConfig.method
        );
        return {
          mfaRequired: true,
          mfaToken,
          userId: user.id
        };
      }

      // Generate enhanced JWT tokens
      const tokens = await this.generateAuthTokens(user, deviceFingerprint);

      // Create secure session with device binding
      await this.sessionService.createSession(
        user.id,
        tokens.refreshToken,
        deviceInfo,
        deviceFingerprint
      );

      return tokens;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Validates MFA token and completes authentication
   * @param userId User identifier
   * @param mfaToken MFA verification token
   * @param verificationCode User-provided verification code
   * @returns Final authentication tokens
   * @throws AuthError on MFA validation failure
   */
  public async validateMFA(
    userId: string,
    mfaToken: string,
    verificationCode: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthTokens> {
    try {
      // Validate MFA token
      const isValid = await this.mfaService.validateMFAChallenge(
        userId,
        mfaToken,
        verificationCode
      );

      if (!isValid) {
        throw new Error('INVALID_MFA_CODE');
      }

      // Retrieve user and generate tokens
      const user = await this.getUserById(userId);
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
      const tokens = await this.generateAuthTokens(user, deviceFingerprint);

      // Create session with full access
      await this.sessionService.createSession(
        userId,
        tokens.refreshToken,
        deviceInfo,
        deviceFingerprint
      );

      return tokens;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Refreshes authentication tokens with security validation
   * @param refreshToken Current refresh token
   * @param deviceInfo Client device information
   * @returns New authentication tokens
   * @throws AuthError on token or session validation failure
   */
  public async refreshToken(
    refreshToken: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = await this.tokenService.verifyToken(
        refreshToken,
        AuthTokenType.REFRESH
      );

      // Validate session and device fingerprint
      const session = await this.sessionService.validateSession(
        payload.sessionId,
        deviceInfo
      );

      // Generate new tokens
      const user = await this.getUserById(payload.userId);
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
      const tokens = await this.generateAuthTokens(user, deviceFingerprint);

      // Update session
      await this.sessionService.updateSession(
        session.id,
        tokens.refreshToken,
        deviceInfo
      );

      return tokens;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Generates secure device fingerprint
   * @param deviceInfo Client device information
   * @returns Cryptographic device fingerprint
   */
  private generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const data = `${deviceInfo.userAgent}|${deviceInfo.ip}|${deviceInfo.screenResolution}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generates enhanced JWT tokens with security context
   * @param user User entity
   * @param deviceFingerprint Device fingerprint
   * @returns Access and refresh tokens
   */
  private async generateAuthTokens(
    user: User,
    deviceFingerprint: string
  ): Promise<AuthTokens> {
    const basePayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceFingerprint
    };

    const accessToken = await this.tokenService.generateToken(
      { ...basePayload, type: AuthTokenType.ACCESS },
      AuthTokenType.ACCESS
    );

    const refreshToken = await this.tokenService.generateToken(
      { ...basePayload, type: AuthTokenType.REFRESH },
      AuthTokenType.REFRESH
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Handles failed login attempts and account lockout
   * @param email User email
   */
  private async handleFailedLogin(email: string): Promise<void> {
    const attempts = await this.rateLimiter.increment(email);
    if (attempts.consumedPoints > this.MAX_LOGIN_ATTEMPTS) {
      await this.lockAccount(email);
    }
  }

  /**
   * Initializes cleanup job for expired sessions and tokens
   */
  private initializeCleanupJob(): void {
    setInterval(async () => {
      await this.sessionService.cleanupExpiredSessions();
      await this.tokenService.cleanupBlacklistedTokens();
    }, this.SESSION_CLEANUP_INTERVAL);
  }

  /**
   * Standardized error handler for authentication operations
   * @param error Error instance
   * @throws Standardized AuthError
   */
  private handleAuthError(error: any): never {
    // Map internal errors to standardized AuthError types
    const errorMap: Record<string, AuthError> = {
      INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
      ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
      MFA_REQUIRED: 'MFA_REQUIRED',
      TOKEN_EXPIRED: 'TOKEN_EXPIRED',
      INVALID_TOKEN: 'INVALID_TOKEN',
      SESSION_EXPIRED: 'SESSION_EXPIRED'
    };

    const authError = errorMap[error.message] || 'INVALID_CREDENTIALS';
    throw new Error(authError);
  }
}

export default AuthService;