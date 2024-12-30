/**
 * @fileoverview Unit tests for UserService with enhanced security and monitoring
 * @version 1.0.0
 */

import { describe, expect, jest, beforeEach, it } from '@jest/globals'; // v29.0.0
import { MockProxy, mock } from 'jest-mock-extended'; // v3.0.0
import { UserService } from '../../src/services/user.service';
import { IUserRepository, IUser } from '../../src/interfaces/user.interface';
import { UserRole, UserStatus, CreateUserDTO, UpdateUserDTO } from '../../src/types/user.types';
import { SecurityContext } from '@security/context'; // v1.0.0
import { ErrorCode } from '../../src/constants/error-codes';
import { StatusCode } from '../../src/constants/status-codes';

describe('UserService', () => {
  let userService: UserService;
  let userRepositoryMock: MockProxy<IUserRepository>;
  let securityContextMock: MockProxy<SecurityContext>;

  // Test data with security classification
  const testUser: IUser & { securityClassification: string } = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.TEAM_MEMBER,
    status: UserStatus.ACTIVE,
    department: 'Engineering',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        inApp: true,
        taskUpdates: true,
        projectUpdates: true
      }
    },
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    securityClassification: 'CONFIDENTIAL'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Initialize mocks with security context
    userRepositoryMock = mock<IUserRepository>();
    securityContextMock = mock<SecurityContext>();

    // Initialize service with mocks
    userService = new UserService(userRepositoryMock);
  });

  describe('create', () => {
    const createUserDTO: CreateUserDTO = {
      email: 'new@example.com',
      name: 'New User',
      role: UserRole.TEAM_MEMBER,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          inApp: true,
          taskUpdates: true,
          projectUpdates: true
        }
      }
    };

    it('should create user with proper security validation', async () => {
      // Setup
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.create.mockResolvedValue({ ...testUser, ...createUserDTO });

      // Execute
      const result = await userService.create(createUserDTO);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDTO.email);
      expect(result.role).toBe(createUserDTO.role);
      expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith(createUserDTO.email);
      expect(userRepositoryMock.create).toHaveBeenCalledWith(expect.objectContaining({
        ...createUserDTO,
        status: UserStatus.PENDING
      }));
    });

    it('should prevent duplicate user creation', async () => {
      // Setup
      userRepositoryMock.findByEmail.mockResolvedValue(testUser);

      // Execute & Assert
      await expect(userService.create(createUserDTO))
        .rejects
        .toThrow('User with this email already exists');
    });

    it('should enforce data classification for new users', async () => {
      // Setup
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.create.mockResolvedValue({ ...testUser, ...createUserDTO });

      // Execute
      const result = await userService.create(createUserDTO);

      // Assert
      expect(result.securityClassification).toBe('CONFIDENTIAL');
    });
  });

  describe('update', () => {
    const updateUserDTO: UpdateUserDTO = {
      name: 'Updated Name',
      role: UserRole.TEAM_LEAD
    };

    it('should enforce role-based access control during updates', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(testUser);
      userRepositoryMock.update.mockResolvedValue({ ...testUser, ...updateUserDTO });

      // Execute
      const result = await userService.update(testUser.id, updateUserDTO);

      // Assert
      expect(result.role).toBe(updateUserDTO.role);
      expect(userRepositoryMock.update).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining(updateUserDTO)
      );
    });

    it('should prevent unauthorized role escalation', async () => {
      // Setup
      const unauthorizedUpdate: UpdateUserDTO = {
        role: UserRole.ADMIN
      };
      userRepositoryMock.findById.mockResolvedValue(testUser);

      // Execute & Assert
      await expect(userService.update(testUser.id, unauthorizedUpdate))
        .rejects
        .toThrow('Invalid role update');
    });

    it('should maintain security classification during updates', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(testUser);
      userRepositoryMock.update.mockResolvedValue({ ...testUser, ...updateUserDTO });

      // Execute
      const result = await userService.update(testUser.id, updateUserDTO);

      // Assert
      expect(result.securityClassification).toBe('CONFIDENTIAL');
    });
  });

  describe('delete', () => {
    it('should validate security context before deletion', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(testUser);

      // Execute
      await userService.delete(testUser.id);

      // Assert
      expect(userRepositoryMock.delete).toHaveBeenCalledWith(testUser.id);
    });

    it('should prevent deletion of non-existent users', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(userService.delete('non-existent-id'))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('findById', () => {
    it('should return user with security context validation', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(testUser);

      // Execute
      const result = await userService.findById(testUser.id);

      // Assert
      expect(result).toEqual(testUser);
      expect(userRepositoryMock.findById).toHaveBeenCalledWith(testUser.id);
    });

    it('should handle non-existent user lookup securely', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(userService.findById('non-existent-id'))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('should return user with proper data masking', async () => {
      // Setup
      userRepositoryMock.findByEmail.mockResolvedValue(testUser);

      // Execute
      const result = await userService.findByEmail(testUser.email);

      // Assert
      expect(result).toEqual(testUser);
      expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith(testUser.email);
    });

    it('should handle non-existent email lookup securely', async () => {
      // Setup
      userRepositoryMock.findByEmail.mockResolvedValue(null);

      // Execute & Assert
      await expect(userService.findByEmail('nonexistent@example.com'))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('findAll', () => {
    it('should apply security filtering to query results', async () => {
      // Setup
      const users = [testUser];
      userRepositoryMock.findAll.mockResolvedValue(users);

      // Execute
      const result = await userService.findAll({ role: UserRole.TEAM_MEMBER });

      // Assert
      expect(result).toEqual(users);
      expect(userRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.TEAM_MEMBER })
      );
    });
  });

  describe('updatePreferences', () => {
    const newPreferences = {
      theme: 'dark',
      language: 'fr',
      notifications: {
        email: false,
        inApp: true,
        taskUpdates: true,
        projectUpdates: false
      }
    };

    it('should update preferences with security validation', async () => {
      // Setup
      userRepositoryMock.findById.mockResolvedValue(testUser);
      userRepositoryMock.update.mockResolvedValue({ ...testUser, preferences: newPreferences });

      // Execute
      const result = await userService.updatePreferences(testUser.id, newPreferences);

      // Assert
      expect(result.preferences).toEqual(newPreferences);
      expect(userRepositoryMock.update).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({ preferences: newPreferences })
      );
    });
  });
});