/**
 * @fileoverview Integration tests for authentication endpoints with comprehensive security validation
 * @version 1.0.0
 */

import request from 'supertest'; // ^6.3.3
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals'; // ^29.7.0
import Redis from 'ioredis-mock'; // ^8.9.0
import nock from 'nock'; // ^13.3.3
import { app } from '../../src/app';
import { AuthService } from '../../src/services/auth.service';
import { UserRole } from '../../src/types/user.types';
import { StatusCode } from '../../src/constants/status-codes';
import { ErrorCode } from '../../src/constants/error-codes';

// Test constants
const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User',
  role: UserRole.TEAM_MEMBER
};

const SSO_USER = {
  email: 'sso@example.com',
  provider: 'SSO',
  name: 'SSO User',
  role: UserRole.TEAM_MEMBER
};

describe('Authentication Integration Tests', () => {
  let authService: AuthService;
  let redisMock: Redis;
  let testJwtToken: string;
  let testRefreshToken: string;

  beforeAll(async () => {
    // Initialize Redis mock
    redisMock = new Redis({
      data: {
        'session:test': JSON.stringify({
          userId: 'test-user-id',
          role: UserRole.TEAM_MEMBER
        })
      }
    });

    // Initialize auth service with mocked dependencies
    authService = new AuthService(
      redisMock,
      {} as any, // Rate limiter mock
      {} as any, // MFA service mock
      {} as any, // Token service mock
      {} as any  // Session service mock
    );

    // Mock SSO provider
    nock('https://sso-provider.example.com')
      .post('/token')
      .reply(200, {
        access_token: 'mock-sso-token',
        id_token: 'mock-id-token'
      });
  });

  afterAll(async () => {
    await redisMock.quit();
    nock.cleanAll();
  });

  beforeEach(() => {
    // Clear rate limiting and session data between tests
    redisMock.flushall();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(TEST_USER)
        .expect('Content-Type', /json/)
        .expect(StatusCode.CREATED);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Registration successful'
      });
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should enforce password complexity requirements', async () => {
      const weakPassword = { ...TEST_USER, password: 'weak' };
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPassword)
        .expect(StatusCode.BAD_REQUEST);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.message).toContain('Password must contain');
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(TEST_USER);

      // Duplicate registration attempt
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(TEST_USER)
        .expect(StatusCode.CONFLICT);

      expect(response.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
    });

    it('should enforce rate limiting on registration attempts', async () => {
      // Make multiple registration attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ ...TEST_USER, email: `test${i}@example.com` });
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...TEST_USER, email: 'final@example.com' })
        .expect(StatusCode.TOO_MANY_REQUESTS);

      expect(response.body.error.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register test user before login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send(TEST_USER);
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(StatusCode.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
      testJwtToken = response.body.accessToken;
      testRefreshToken = response.headers['set-cookie'][0];
    });

    it('should handle SSO authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          provider: 'SSO',
          token: 'mock-sso-token'
        })
        .expect(StatusCode.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should enforce MFA when enabled', async () => {
      // Mock user with MFA enabled
      redisMock.set('user:mfa:test@example.com', 'true');

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(StatusCode.OK);

      expect(response.body.mfaRequired).toBe(true);
      expect(response.body.mfaToken).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER.email,
          password: 'wrongpassword'
        })
        .expect(StatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
    });

    it('should enforce rate limiting on failed login attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: TEST_USER.email,
            password: 'wrongpassword'
          });
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(StatusCode.TOO_MANY_REQUESTS);

      expect(response.body.error.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [testRefreshToken])
        .expect(StatusCode.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject expired refresh tokens', async () => {
      // Mock expired refresh token
      const expiredToken = 'refresh_token=expired; Path=/; HttpOnly; Secure';
      
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [expiredToken])
        .expect(StatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.TOKEN_EXPIRED);
    });

    it('should handle missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .expect(StatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully logout and invalidate tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('Cookie', [testRefreshToken])
        .expect(StatusCode.NO_CONTENT);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
    });

    it('should handle logout without active session', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(StatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
    });
  });

  describe('Security Headers and CORS', () => {
    it('should set security headers on all responses', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health')
        .expect(StatusCode.OK);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should enforce CORS policies', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .expect(StatusCode.FORBIDDEN);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});