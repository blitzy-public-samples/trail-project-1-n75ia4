/**
 * @fileoverview Enhanced authentication controller with comprehensive security features
 * Implements secure authentication flows with JWT tokens, SSO integration, and MFA support
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // ^4.18.2
import { validateOrReject } from 'class-validator'; // ^0.14.0
import { AuthService } from '../services/auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
  MfaDto
} from '../dto/auth.dto';
import { createError } from '../utils/error.util';
import { enhancedLogger as logger } from '../utils/logger.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';
import { AuthProvider } from '../types/auth.types';

/**
 * Enhanced authentication controller implementing secure authentication flows
 * with comprehensive security features and monitoring
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles user authentication with enhanced security measures
   * @param req Express request object
   * @param res Express response object
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      // Create and validate login DTO
      const loginDto = new LoginDto();
      Object.assign(loginDto, req.body);
      await validateOrReject(loginDto);

      // Extract device information for fingerprinting
      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        screenResolution: req.headers['x-screen-resolution'] || '',
      };

      // Attempt authentication
      const authResult = await this.authService.login(loginDto, deviceInfo);

      // Handle MFA requirement
      if (authResult.mfaRequired) {
        return res.status(StatusCode.OK).json({
          mfaRequired: true,
          mfaToken: authResult.mfaToken,
          userId: authResult.userId
        });
      }

      // Set secure cookie with refresh token
      res.cookie('refreshToken', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Log successful authentication
      logger.security('User authenticated successfully', {
        userId: authResult.userId,
        action: 'LOGIN',
        provider: loginDto.provider
      });

      return res.status(StatusCode.OK).json({
        accessToken: authResult.accessToken,
        expiresIn: authResult.expiresIn
      });

    } catch (error) {
      logger.error('Authentication failed', { error });
      throw createError(
        'Authentication failed',
        StatusCode.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_ERROR,
        undefined,
        { action: 'LOGIN', email: req.body.email }
      );
    }
  }

  /**
   * Handles MFA verification during authentication
   * @param req Express request object
   * @param res Express response object
   */
  public async verifyMfa(req: Request, res: Response): Promise<Response> {
    try {
      const mfaDto = new MfaDto();
      Object.assign(mfaDto, req.body);
      await validateOrReject(mfaDto);

      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        screenResolution: req.headers['x-screen-resolution'] || '',
      };

      const authResult = await this.authService.validateMFA(
        mfaDto.userId,
        mfaDto.mfaToken,
        mfaDto.verificationCode,
        deviceInfo
      );

      // Set secure cookie with refresh token
      res.cookie('refreshToken', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.security('MFA verification successful', {
        userId: mfaDto.userId,
        action: 'MFA_VERIFY'
      });

      return res.status(StatusCode.OK).json({
        accessToken: authResult.accessToken,
        expiresIn: authResult.expiresIn
      });

    } catch (error) {
      logger.error('MFA verification failed', { error });
      throw createError(
        'MFA verification failed',
        StatusCode.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_ERROR,
        undefined,
        { action: 'MFA_VERIFY', userId: req.body.userId }
      );
    }
  }

  /**
   * Handles user registration with enhanced security measures
   * @param req Express request object
   * @param res Express response object
   */
  public async register(req: Request, res: Response): Promise<Response> {
    try {
      const registerDto = new RegisterDto();
      Object.assign(registerDto, req.body);
      await validateOrReject(registerDto);

      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        screenResolution: req.headers['x-screen-resolution'] || '',
      };

      await this.authService.register(registerDto, deviceInfo);

      logger.security('User registered successfully', {
        email: registerDto.email,
        action: 'REGISTER',
        provider: registerDto.provider
      });

      return res.status(StatusCode.CREATED).json({
        message: 'Registration successful'
      });

    } catch (error) {
      logger.error('Registration failed', { error });
      throw createError(
        'Registration failed',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        undefined,
        { action: 'REGISTER', email: req.body.email }
      );
    }
  }

  /**
   * Handles JWT token refresh with security validation
   * @param req Express request object
   * @param res Express response object
   */
  public async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        screenResolution: req.headers['x-screen-resolution'] || '',
      };

      const tokens = await this.authService.refreshToken(refreshToken, deviceInfo);

      // Update refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.security('Token refreshed successfully', {
        action: 'REFRESH_TOKEN'
      });

      return res.status(StatusCode.OK).json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      });

    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw createError(
        'Token refresh failed',
        StatusCode.UNAUTHORIZED,
        ErrorCode.TOKEN_EXPIRED,
        undefined,
        { action: 'REFRESH_TOKEN' }
      );
    }
  }

  /**
   * Handles secure user logout and session termination
   * @param req Express request object
   * @param res Express response object
   */
  public async logout(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      logger.security('User logged out successfully', {
        action: 'LOGOUT'
      });

      return res.status(StatusCode.NO_CONTENT).send();

    } catch (error) {
      logger.error('Logout failed', { error });
      throw createError(
        'Logout failed',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
        undefined,
        { action: 'LOGOUT' }
      );
    }
  }
}

export default AuthController;