/**
 * @fileoverview Central API router configuration implementing comprehensive security,
 * monitoring, and performance features with role-based access control.
 * @version 1.0.0
 */

// External imports
import express, { Application } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import correlator from 'express-correlation-id'; // ^2.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0

// Internal imports
import { authRouter } from '../routes/auth.routes';
import { projectRouter } from '../routes/project.routes';
import { taskRouter } from '../routes/task.routes';
import { userRouter } from '../routes/user.routes';
import { errorMiddleware } from '../middleware/error.middleware';
import { loggerMiddleware } from '../middleware/logger.middleware';
import { enhancedLogger as logger } from '../utils/logger.util';

// Constants
const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;
const COMPRESSION_LEVEL = 6;

/**
 * Configures and returns the Express router with comprehensive middleware pipeline
 * and route configurations
 * @param app Express application instance
 */
export const configureRoutes = (app: Application): void => {
  // Configure security middleware with CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
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

  // Configure CORS with strict options
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-RateLimit-Reset', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Configure response compression
  app.use(compression({
    level: COMPRESSION_LEVEL,
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Setup correlation ID tracking
  app.use(correlator());

  // Configure request logging with correlation IDs
  app.use(loggerMiddleware);

  // Configure global rate limiting
  app.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        correlationId: req.correlationId
      });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      });
    }
  }));

  // Parse JSON bodies with size limit
  app.use(express.json({ limit: '10kb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Mount route modules with their respective prefixes
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/projects`, projectRouter);
  app.use(`${API_PREFIX}/tasks`, taskRouter);
  app.use(`${API_PREFIX}/users`, userRouter);

  // Configure global error handling
  app.use(errorMiddleware);

  // Setup API deprecation notices
  app.use((req, res, next) => {
    if (req.path.includes('/api/v0')) {
      logger.warn('Deprecated API version accessed', {
        path: req.path,
        correlationId: req.correlationId
      });
      res.set('X-API-Deprecated', 'true');
      res.set('X-API-Message', 'This API version is deprecated. Please upgrade to v1');
    }
    next();
  });

  // Log successful route configuration
  logger.info('API routes configured successfully', {
    prefix: API_PREFIX,
    version: API_VERSION,
    routes: [
      `${API_PREFIX}/auth`,
      `${API_PREFIX}/projects`,
      `${API_PREFIX}/tasks`,
      `${API_PREFIX}/users`
    ]
  });
};

export default configureRoutes;