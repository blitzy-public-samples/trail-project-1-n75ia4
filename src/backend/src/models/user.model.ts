/**
 * @fileoverview Enhanced User model implementation with Prisma integration, caching, and security features
 * @version 1.0.0
 * @module models/user
 */

import { PrismaClient, Prisma } from '@prisma/client'; // v5.0+
import Redis from 'ioredis'; // v5.0+
import { IUser } from '../interfaces/user.interface';
import { 
  UserRole, 
  UserStatus, 
  UserPreferences,
  CreateUserDTO,
  UpdateUserDTO 
} from '../types/user.types';
import { Logger } from '../utils/logger'; // Assumed logger utility

/**
 * Cache configuration for user data
 */
const CACHE_CONFIG = {
  TTL: 3600, // 1 hour cache TTL
  PREFIX: 'user:',
};

/**
 * Enhanced User model class implementing secure user management operations
 * with Prisma integration and Redis caching
 */
export class User implements IUser {
  private prisma: PrismaClient;
  private cache: Redis;
  private logger: Logger;

  // IUser interface implementation
  public id: string;
  public email: string;
  public name: string;
  public role: UserRole;
  public status: UserStatus;
  public department: string;
  public preferences: UserPreferences;
  public lastLoginAt: Date;
  public createdAt: Date;
  public updatedAt: Date;

  /**
   * Creates a new User model instance
   * @param prisma - Prisma client instance
   * @param cache - Redis cache client
   */
  constructor(prisma: PrismaClient, cache: Redis) {
    this.prisma = prisma;
    this.cache = cache;
    this.logger = new Logger('UserModel');
  }

  /**
   * Generates cache key for user data
   * @param identifier - User identifier (id or email)
   * @returns Formatted cache key
   */
  private getCacheKey(identifier: string): string {
    return `${CACHE_CONFIG.PREFIX}${identifier}`;
  }

  /**
   * Creates a new user with validation and security checks
   * @param data - User creation data
   * @returns Promise resolving to created user
   * @throws Error if email already exists
   */
  async create(data: CreateUserDTO): Promise<IUser> {
    try {
      // Start transaction for data consistency
      return await this.prisma.$transaction(async (tx) => {
        // Check for existing user
        const existingUser = await tx.user.findUnique({
          where: { email: data.email }
        });

        if (existingUser) {
          throw new Error('Email already registered');
        }

        // Create user with default preferences if not provided
        const user = await tx.user.create({
          data: {
            ...data,
            preferences: data.preferences || {
              theme: 'light',
              language: 'en',
              notifications: {
                email: true,
                inApp: true,
                taskUpdates: true,
                projectUpdates: true
              }
            },
            status: UserStatus.PENDING
          }
        });

        // Cache the new user
        await this.cache.setex(
          this.getCacheKey(user.id),
          CACHE_CONFIG.TTL,
          JSON.stringify(user)
        );

        this.logger.info(`User created: ${user.id}`);
        return user;
      });
    } catch (error) {
      this.logger.error('User creation failed:', error);
      throw error;
    }
  }

  /**
   * Updates user information with validation
   * @param id - User ID
   * @param data - Update data
   * @returns Promise resolving to updated user
   */
  async update(id: string, data: UpdateUserDTO): Promise<IUser> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        });

        // Update cache
        await this.cache.setex(
          this.getCacheKey(user.id),
          CACHE_CONFIG.TTL,
          JSON.stringify(user)
        );

        this.logger.info(`User updated: ${id}`);
        return user;
      });
    } catch (error) {
      this.logger.error(`User update failed for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft deletes a user
   * @param id - User ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            status: UserStatus.INACTIVE,
            deletedAt: new Date()
          }
        });

        // Remove from cache
        await this.cache.del(this.getCacheKey(id));
        this.logger.info(`User deleted: ${id}`);
      });
    } catch (error) {
      this.logger.error(`User deletion failed for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Finds user by ID with caching
   * @param id - User ID
   * @returns Promise resolving to user or null
   */
  async findById(id: string): Promise<IUser | null> {
    try {
      // Check cache first
      const cached = await this.cache.get(this.getCacheKey(id));
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database if cache miss
      const user = await this.prisma.user.findUnique({
        where: { 
          id,
          status: { not: UserStatus.INACTIVE }
        }
      });

      if (user) {
        // Update cache
        await this.cache.setex(
          this.getCacheKey(id),
          CACHE_CONFIG.TTL,
          JSON.stringify(user)
        );
      }

      return user;
    } catch (error) {
      this.logger.error(`Find user by ID failed for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Finds user by email with caching
   * @param email - User email
   * @returns Promise resolving to user or null
   */
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      // Check cache first
      const cached = await this.cache.get(this.getCacheKey(email));
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database if cache miss
      const user = await this.prisma.user.findUnique({
        where: { 
          email,
          status: { not: UserStatus.INACTIVE }
        }
      });

      if (user) {
        // Update cache
        await this.cache.setex(
          this.getCacheKey(email),
          CACHE_CONFIG.TTL,
          JSON.stringify(user)
        );
      }

      return user;
    } catch (error) {
      this.logger.error(`Find user by email failed for email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Updates user preferences
   * @param id - User ID
   * @param preferences - New preferences
   * @returns Promise resolving to updated user
   */
  async updatePreferences(id: string, preferences: UserPreferences): Promise<IUser> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: {
            preferences,
            updatedAt: new Date()
          }
        });

        // Update cache
        await this.cache.setex(
          this.getCacheKey(user.id),
          CACHE_CONFIG.TTL,
          JSON.stringify(user)
        );

        this.logger.info(`User preferences updated: ${id}`);
        return user;
      });
    } catch (error) {
      this.logger.error(`Preference update failed for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Updates user's last login timestamp
   * @param id - User ID
   * @returns Promise resolving to updated user
   */
  async updateLastLogin(id: string): Promise<IUser> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          lastLoginAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Last login update failed for ID ${id}:`, error);
      throw error;
    }
  }
}

export default User;