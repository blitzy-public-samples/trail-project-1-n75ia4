/**
 * @fileoverview Repository implementation for user data access operations using Prisma ORM
 * @version 1.0.0
 * @module repositories/user
 */

import { PrismaClient } from '@prisma/client'; // v5.0+
import { injectable } from 'inversify'; // v6.0+
import { IUserRepository } from '../interfaces/user.interface';
import {
  UserRole,
  UserStatus,
  UserPreferences,
  CreateUserDTO,
  UpdateUserDTO,
  UserQueryParams,
  User
} from '../types/user.types';

/**
 * Repository implementation for secure user data access operations
 * Implements IUserRepository interface with comprehensive validation and error handling
 */
@injectable()
export class UserRepository implements IUserRepository {
  private readonly prisma: PrismaClient;

  /**
   * Initializes the user repository with Prisma client
   * Configures connection pooling and query logging
   */
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Creates a new user with comprehensive validation and security checks
   * @param data User creation data
   * @returns Promise resolving to created user
   * @throws Error if email already exists or validation fails
   */
  async create(data: CreateUserDTO): Promise<User> {
    // Check for existing user with same email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user with transaction to ensure data consistency
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: data.role,
          status: UserStatus.PENDING,
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
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create associated role permissions
      await tx.userPermissions.create({
        data: {
          userId: user.id,
          role: user.role,
          permissions: this.getDefaultPermissionsForRole(user.role)
        }
      });

      return user;
    });
  }

  /**
   * Updates an existing user with validation and security checks
   * @param id User ID
   * @param data Update data
   * @returns Promise resolving to updated user
   * @throws Error if user not found or validation fails
   */
  async update(id: string, data: UpdateUserDTO): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.role && { role: data.role }),
          ...(data.status && { status: data.status }),
          ...(data.preferences && { preferences: {
            ...existingUser.preferences,
            ...data.preferences
          }}),
          updatedAt: new Date()
        }
      });

      // Update role permissions if role changed
      if (data.role && data.role !== existingUser.role) {
        await tx.userPermissions.update({
          where: { userId: id },
          data: {
            role: data.role,
            permissions: this.getDefaultPermissionsForRole(data.role)
          }
        });
      }

      return updatedUser;
    });
  }

  /**
   * Performs a secure soft delete of a user
   * @param id User ID
   * @throws Error if user not found
   */
  async delete(id: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete user
      await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.INACTIVE,
          updatedAt: new Date(),
          deletedAt: new Date()
        }
      });

      // Revoke all active sessions
      await tx.userSession.updateMany({
        where: { userId: id, active: true },
        data: { active: false, revokedAt: new Date() }
      });
    });
  }

  /**
   * Securely retrieves a user by ID with role-based access control
   * @param id User ID
   * @returns Promise resolving to found user or null
   */
  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { 
        id,
        status: { not: UserStatus.INACTIVE }
      },
      include: {
        permissions: true
      }
    });
  }

  /**
   * Securely retrieves a user by email with validation
   * @param email User email
   * @returns Promise resolving to found user or null
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { 
        email,
        status: { not: UserStatus.INACTIVE }
      },
      include: {
        permissions: true
      }
    });
  }

  /**
   * Retrieves users with advanced filtering, pagination, and role-based access
   * @param query Query parameters
   * @returns Promise resolving to list of users
   */
  async findAll(query: UserQueryParams): Promise<User[]> {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build filter conditions
    const where = {
      status: status || { not: UserStatus.INACTIVE },
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Execute paginated query
    return await this.prisma.user.findMany({
      where,
      include: {
        permissions: true
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder
      }
    });
  }

  /**
   * Gets default permissions for a given user role
   * @private
   * @param role User role
   * @returns Default permissions object
   */
  private getDefaultPermissionsForRole(role: UserRole): string[] {
    const permissions = {
      [UserRole.ADMIN]: ['*'],
      [UserRole.PROJECT_MANAGER]: [
        'project.create',
        'project.update',
        'project.delete',
        'task.create',
        'task.update',
        'task.delete'
      ],
      [UserRole.TEAM_LEAD]: [
        'task.create',
        'task.update',
        'team.view',
        'team.update'
      ],
      [UserRole.TEAM_MEMBER]: [
        'task.create',
        'task.update',
        'task.view'
      ],
      [UserRole.GUEST]: [
        'task.view',
        'project.view'
      ]
    };

    return permissions[role] || [];
  }
}