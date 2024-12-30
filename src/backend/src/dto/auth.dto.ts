/**
 * @fileoverview Data Transfer Objects for authentication-related requests and responses
 * @version 1.0.0
 * @module dto/auth
 * 
 * Implements secure DTOs for JWT-based authentication with comprehensive validation
 * and multi-provider support including SSO integration as specified in the technical
 * requirements.
 */

import { 
  IsEmail, 
  IsString, 
  IsEnum, 
  MinLength, 
  MaxLength, 
  IsNotEmpty, 
  Matches, 
  IsJWT,
  IsNumber,
  Min,
  ValidateIf
} from 'class-validator'; // ^0.14.0
import { ApiProperty, ApiModel, ApiTags } from '@nestjs/swagger'; // ^9.0.0
import { Match } from '../decorators/match.decorator';
import { AuthProvider, AuthTokenType } from '../types/auth.types';

/**
 * DTO for validating login requests with enhanced security measures
 * Implements requirements from security specifications section 7.1
 */
@ApiTags('auth')
@ApiModel({ description: 'Login request payload' })
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password - minimum 8 characters with at least one uppercase, lowercase and number',
    example: 'Password123'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
  )
  @ValidateIf(o => o.provider === AuthProvider.LOCAL)
  password: string;

  @ApiProperty({
    description: 'Authentication provider',
    enum: AuthProvider,
    example: AuthProvider.LOCAL
  })
  @IsEnum(AuthProvider)
  @IsNotEmpty()
  provider: AuthProvider;
}

/**
 * DTO for validating user registration with strict password requirements
 * Implements enhanced security measures as per section 7.2
 */
@ApiTags('auth')
@ApiModel({ description: 'Registration request payload' })
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password - minimum 8 characters with complex requirements',
    example: 'Password123!'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  @ValidateIf(o => o.provider === AuthProvider.LOCAL)
  password: string;

  @ApiProperty({
    description: 'Confirm password - must match password',
    example: 'Password123!'
  })
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  @ValidateIf(o => o.provider === AuthProvider.LOCAL)
  confirmPassword: string;

  @ApiProperty({
    description: 'Authentication provider',
    enum: AuthProvider,
    example: AuthProvider.LOCAL
  })
  @IsEnum(AuthProvider)
  @IsNotEmpty()
  provider: AuthProvider;
}

/**
 * DTO for validating token refresh requests with JWT format validation
 * Implements token refresh flow as specified in section 7.1.1
 */
@ApiTags('auth')
@ApiModel({ description: 'Token refresh request payload' })
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Valid JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}

/**
 * DTO for structuring authentication token responses with expiration
 * Implements token response structure as per security specifications
 */
@ApiTags('auth')
@ApiModel({ description: 'Authentication token response' })
export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsJWT()
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsJWT()
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600
  })
  @IsNumber()
  @Min(0)
  expiresIn: number;
}