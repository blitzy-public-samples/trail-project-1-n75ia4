/**
 * @fileoverview Main application entry point implementing enterprise-grade features
 * @version 1.0.0
 */

// External imports with versions
import express, { Express, json, urlencoded } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import { Registry, collectDefaultMetrics } from 'prom-client'; // ^14.2.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import https from 'https';
import fs from 'fs';

// Internal imports
import router from './routes';
import { WebSocketManager } from './websocket';
import { enhancedLogger as logger } from './utils/logger.util';
import { createError } from './utils/error.util';
import { StatusCode } from './constants/status-codes';
import { ErrorCode } from './constants/error-codes';

/**
 * Enterprise-grade application manager implementing comprehensive security,
 * monitoring, and scalability features
 */
export class App {
  private readonly app: Express;
  private readonly port: number;
  private readonly metricsPort: number;
  private readonly wsManager: WebSocketManager;
  private server: https.Server;
  private metricsRegistry: Registry;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.metricsPort = parseInt(process.env.METRICS_PORT || '9090', 10);
    this.wsManager = new WebSocketManager();
    this.metricsRegistry = new Registry();

    // Initialize metrics collection
    collectDefaultMetrics({ register: this.metricsRegistry });
  }

  /**
   * Initializes comprehensive middleware stack with security features
   */
  private initializeMiddleware(): void {
    // Security headers
    this.app.use(helmet({
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
      referrerPolicy: { policy: 'same-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
      exposedHeaders: ['X-RateLimit-Reset', 'X-RateLimit-Limit'],
      credentials: true,
      maxAge: 600 // 10 minutes
    }));

    // Request parsing
    this.app.use(json({ limit: '1mb' }));
    this.app.use(urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(compression());

    // Add correlation ID
    this.app.use((req, res, next) => {
      req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || 
                                      crypto.randomUUID();
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        correlationId: req.headers['x-correlation-id']
      });
      next();
    });
  }

  /**
   * Initializes API routes with versioning and security
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(StatusCode.OK).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', this.metricsRegistry.contentType);
        res.end(await this.metricsRegistry.metrics());
      } catch (error) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).end();
      }
    });

    // API routes
    this.app.use('/api/v1', router);

    // 404 handler
    this.app.use((req, res) => {
      throw createError(
        'Resource not found',
        StatusCode.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
        req.headers['x-correlation-id'] as string
      );
    });

    // Global error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      logger.error('Unhandled error:', {
        error: err,
        path: req.path,
        correlationId: req.headers['x-correlation-id']
      });

      res.status(err.statusCode || StatusCode.INTERNAL_SERVER_ERROR).json({
        error: {
          code: err.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
          message: err.message || 'Internal server error',
          correlationId: req.headers['x-correlation-id']
        }
      });
    });
  }

  /**
   * Starts HTTPS server with WebSocket support
   */
  private async startServer(): Promise<void> {
    // Load SSL certificates
    const sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY || 'ssl/server.key'),
      cert: fs.readFileSync(process.env.SSL_CERT || 'ssl/server.crt')
    };

    // Create HTTPS server
    this.server = https.createServer(sslOptions, this.app);

    // Initialize WebSocket
    await this.wsManager.initialize();

    // Start listening
    this.server.listen(this.port, () => {
      logger.info(`Server listening on port ${this.port}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Initializes the complete application stack
   */
  public async initialize(): Promise<void> {
    try {
      this.initializeMiddleware();
      this.initializeRoutes();
      await this.startServer();

      logger.info('Application initialized successfully', {
        port: this.port,
        environment: process.env.NODE_ENV
      });
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Gracefully shuts down the application
   */
  public async shutdown(): Promise<void> {
    logger.info('Initiating graceful shutdown...');

    try {
      // Close HTTP server
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });

      // Close WebSocket connections
      await this.wsManager.shutdown();

      logger.info('Application shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Export singleton instance
export const app = new App();