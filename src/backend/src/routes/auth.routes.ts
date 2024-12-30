/**
 * @fileoverview Authentication routes configuration implementing secure authentication flows
 * with JWT tokens, rate limiting, request validation, and comprehensive security monitoring.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import cors from 'cors'; // ^2.8.5

// Internal imports
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto/auth.dto';
import { enhancedLogger as logger } from '../utils/logger.util';
import { ErrorCode } from '../constants/error-codes';
import { StatusCode } from '../constants/status-codes';

// Constants for rate limiting
const AUTH_RATE_LIMIT = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 attempts per window
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3 // 3 attempts per window
  },
  refreshToken: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10 // 10 attempts per window
  }
};

/**
 * Initializes authentication routes with comprehensive security middleware
 * @returns Configured Express router with secure authentication routes
 */
const initializeAuthRoutes = (): Router => {
  const router = express.Router();
  const authController = new AuthController();

  // Apply security middleware
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }));

  // Configure CORS
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Reset', 'X-RateLimit-Limit'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Login endpoint with rate limiting and validation
  router.post('/login',
    rateLimiter({
      windowMs: AUTH_RATE_LIMIT.login.windowMs,
      maxRequests: AUTH_RATE_LIMIT.login.maxRequests,
      keyPrefix: 'login:',
      handler: (req, res) => {
        logger.security('Login rate limit exceeded', {
          ip: req.ip,
          email: req.body.email
        });
        res.status(StatusCode.TOO_MANY_REQUESTS).json({
          code: ErrorCode.RATE_LIMIT_ERROR,
          message: 'Too many login attempts. Please try again later.'
        });
      }
    }),
    validationMiddleware(LoginDto),
    async (req, res, next) => {
      try {
        logger.info('Processing login request', {
          ip: req.ip,
          email: req.body.email
        });
        await authController.login(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Registration endpoint with rate limiting and validation
  router.post('/register',
    rateLimiter({
      windowMs: AUTH_RATE_LIMIT.register.windowMs,
      maxRequests: AUTH_RATE_LIMIT.register.maxRequests,
      keyPrefix: 'register:',
      handler: (req, res) => {
        logger.security('Registration rate limit exceeded', {
          ip: req.ip,
          email: req.body.email
        });
        res.status(StatusCode.TOO_MANY_REQUESTS).json({
          code: ErrorCode.RATE_LIMIT_ERROR,
          message: 'Too many registration attempts. Please try again later.'
        });
      }
    }),
    validationMiddleware(RegisterDto),
    async (req, res, next) => {
      try {
        logger.info('Processing registration request', {
          ip: req.ip,
          email: req.body.email
        });
        await authController.register(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Token refresh endpoint with rate limiting and authentication
  router.post('/refresh-token',
    rateLimiter({
      windowMs: AUTH_RATE_LIMIT.refreshToken.windowMs,
      maxRequests: AUTH_RATE_LIMIT.refreshToken.maxRequests,
      keyPrefix: 'refresh:',
      handler: (req, res) => {
        logger.security('Token refresh rate limit exceeded', { ip: req.ip });
        res.status(StatusCode.TOO_MANY_REQUESTS).json({
          code: ErrorCode.RATE_LIMIT_ERROR,
          message: 'Too many token refresh attempts. Please try again later.'
        });
      }
    }),
    validationMiddleware(RefreshTokenDto),
    async (req, res, next) => {
      try {
        logger.info('Processing token refresh request', { ip: req.ip });
        await authController.refreshToken(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Logout endpoint with authentication
  router.post('/logout',
    authenticate,
    async (req, res, next) => {
      try {
        logger.info('Processing logout request', {
          userId: req.user?.userId,
          ip: req.ip
        });
        await authController.logout(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Error handling middleware
  router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Authentication route error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      ip: req.ip
    });

    res.status(err.statusCode || StatusCode.INTERNAL_SERVER_ERROR).json({
      code: err.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      message: err.message || 'Internal server error'
    });
  });

  return router;
};

export default initializeAuthRoutes;