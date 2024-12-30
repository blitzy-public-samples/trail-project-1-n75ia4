/**
 * Main API Entry Point
 * @description Centralized export of all API-related functionality with enhanced security,
 * monitoring, and error handling capabilities for the Task Management System.
 * @version 1.0.0
 */

// Third-party imports with versions
import axios from 'axios'; // v1.6.0
import retry from 'axios-retry'; // v3.8.0
import rateLimit from 'axios-rate-limit'; // v1.3.0
import circuitBreaker from 'opossum'; // v7.1.0

// Internal imports
import * as authApi from './auth.api';
import { ProjectApi } from './project.api';
import { TaskApi } from './task.api';
import * as userApi from './user.api';
import * as websocketApi from './websocket.api';
import { API_ENDPOINTS, API_RATE_LIMITS } from '../constants/api.constants';
import { ApiError, ApiErrorCode } from '../types/api.types';

/**
 * Global API configuration with enhanced security and monitoring
 */
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0'
  }
};

/**
 * Rate limiting configuration per endpoint
 */
const RATE_LIMIT_CONFIG = {
  auth: API_RATE_LIMITS.AUTH,
  users: API_RATE_LIMITS.USERS,
  projects: API_RATE_LIMITS.PROJECTS,
  tasks: API_RATE_LIMITS.TASKS
};

/**
 * Circuit breaker configuration for API resilience
 */
const CIRCUIT_BREAKER_CONFIG = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000 // 30 seconds
};

/**
 * Initialize API instances with enhanced security and monitoring
 */
const initializeApi = () => {
  // Configure axios instance with retry mechanism
  const axiosInstance = axios.create(API_CONFIG);
  retry(axiosInstance, {
    retries: 3,
    retryDelay: retry.exponentialDelay,
    retryCondition: (error) => {
      return retry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429;
    }
  });

  // Apply rate limiting
  const rateLimitedAxios = rateLimit(axiosInstance, {
    maxRequests: 100,
    perMilliseconds: 60000
  });

  // Configure circuit breaker
  const breaker = new circuitBreaker(rateLimitedAxios, CIRCUIT_BREAKER_CONFIG);
  breaker.fallback(() => {
    throw {
      message: 'Service temporarily unavailable',
      code: ApiErrorCode.SERVICE_UNAVAILABLE,
      status: 503,
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID()
    } as ApiError;
  });

  return {
    axios: rateLimitedAxios,
    breaker
  };
};

// Initialize API services
const { axios: enhancedAxios, breaker } = initializeApi();

// Initialize API instances
const projectApi = new ProjectApi(enhancedAxios);
const taskApi = new TaskApi(enhancedAxios);

/**
 * Export authenticated API namespace with enhanced security
 */
export const auth = {
  login: authApi.login,
  register: authApi.register,
  logout: authApi.logout,
  refreshToken: authApi.refreshToken
};

/**
 * Export project management API with request queuing
 */
export const project = {
  getProjects: projectApi.getProjects.bind(projectApi),
  getProjectById: projectApi.getProjectById.bind(projectApi),
  createProject: projectApi.createProject.bind(projectApi),
  updateProject: projectApi.updateProject.bind(projectApi),
  deleteProject: projectApi.deleteProject.bind(projectApi)
};

/**
 * Export task management API with request queuing
 */
export const task = {
  getTasks: taskApi.getTasks.bind(taskApi),
  getTaskById: taskApi.getTaskById.bind(taskApi),
  createTask: taskApi.createTask.bind(taskApi),
  updateTask: taskApi.updateTask.bind(taskApi),
  deleteTask: taskApi.deleteTask.bind(taskApi)
};

/**
 * Export user management API with enhanced security
 */
export const user = {
  getUsers: userApi.getUsers,
  getUserById: userApi.getUserById,
  updateUser: userApi.updateUser,
  deleteUser: userApi.deleteUser
};

/**
 * Export WebSocket API for real-time communication
 */
export const websocket = {
  WebSocketEventType: websocketApi.WebSocketEventType,
  WebSocketPayload: {} as websocketApi.WebSocketPayload,
  createWebSocketPayload: websocketApi.createWebSocketPayload,
  parseWebSocketMessage: websocketApi.parseWebSocketMessage,
  client: websocketApi.websocketClient
};

/**
 * Export API endpoints for direct access
 */
export const endpoints = API_ENDPOINTS;

/**
 * Export rate limits for monitoring
 */
export const rateLimits = API_RATE_LIMITS;

/**
 * Export circuit breaker for status monitoring
 */
export const circuitBreakerStatus = breaker;

// Default export of all API functionality
export default {
  auth,
  project,
  task,
  user,
  websocket,
  endpoints,
  rateLimits,
  circuitBreakerStatus
};