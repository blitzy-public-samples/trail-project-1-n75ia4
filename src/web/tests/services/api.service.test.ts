/**
 * @fileoverview Comprehensive test suite for ApiService
 * Tests HTTP communications, security features, performance metrics, and error handling
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // v29.0.0
import MockAdapter from 'axios-mock-adapter'; // v1.22.0
import now from 'performance-now'; // v2.1.0

import { ApiService } from '../../src/services/api.service';
import { 
  ApiResponse, 
  ApiError, 
  SecurityHeaders 
} from '../../src/types/api.types';
import { 
  API_ENDPOINTS, 
  HTTP_METHODS, 
  HTTP_STATUS, 
  API_RATE_LIMITS 
} from '../../src/constants/api.constants';

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxios: MockAdapter;
  let performanceTimer: number;

  // Mock data
  const mockTask = {
    id: '123',
    title: 'Test Task',
    description: 'Test Description'
  };

  const mockApiResponse: ApiResponse = {
    data: mockTask,
    message: 'Success',
    status: HTTP_STATUS.OK,
    timestamp: new Date().toISOString()
  };

  const mockApiError: ApiError = {
    message: 'Error occurred',
    code: 'ERROR_CODE',
    status: HTTP_STATUS.BAD_REQUEST,
    details: {},
    timestamp: new Date().toISOString(),
    traceId: '123-456'
  };

  beforeEach(() => {
    // Initialize API service with test configuration
    apiService = new ApiService({
      maxRetries: 2,
      retryDelay: 100
    });

    // Initialize mock adapter
    mockAxios = new MockAdapter(apiService['client']);

    // Set up security tokens
    localStorage.setItem('accessToken', 'mock-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');

    // Initialize performance timer
    performanceTimer = now();
  });

  afterEach(() => {
    mockAxios.reset();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should successfully make GET request with query parameters', async () => {
      const endpoint = `${API_ENDPOINTS.TASKS}/123`;
      const params = { fields: ['title', 'description'] };

      mockAxios.onGet(endpoint).reply(200, mockApiResponse);

      const response = await apiService.get(endpoint, params);
      
      expect(response).toEqual(mockApiResponse);
      expect(mockAxios.history.get[0].params).toEqual(params);
      expect(mockAxios.history.get[0].headers['Authorization']).toBe('Bearer mock-token');
    });

    it('should handle POST request with payload validation', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      
      mockAxios.onPost(endpoint).reply(201, {
        ...mockApiResponse,
        status: HTTP_STATUS.CREATED
      });

      const response = await apiService.post(endpoint, mockTask);
      
      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual(mockTask);
    });

    it('should process PUT request with proper headers', async () => {
      const endpoint = `${API_ENDPOINTS.TASKS}/123`;
      const updatedTask = { ...mockTask, title: 'Updated Title' };

      mockAxios.onPut(endpoint).reply(200, {
        ...mockApiResponse,
        data: updatedTask
      });

      const response = await apiService.put(endpoint, updatedTask);
      
      expect(response.data).toEqual(updatedTask);
      expect(mockAxios.history.put[0].headers['Content-Type']).toBe('application/json');
    });

    it('should execute DELETE request with confirmation', async () => {
      const endpoint = `${API_ENDPOINTS.TASKS}/123`;
      
      mockAxios.onDelete(endpoint).reply(200, mockApiResponse);

      const response = await apiService.delete(endpoint);
      
      expect(response).toEqual(mockApiResponse);
      expect(mockAxios.history.delete[0].headers['Authorization']).toBe('Bearer mock-token');
    });
  });

  describe('Security', () => {
    it('should handle token refresh flow', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      const newToken = 'new-mock-token';

      // First request fails with 401
      mockAxios.onGet(endpoint).replyOnce(401, mockApiError);
      
      // Token refresh succeeds
      mockAxios.onPost(`${API_ENDPOINTS.AUTH}/refresh`).replyOnce(200, {
        data: { accessToken: newToken },
        status: HTTP_STATUS.OK
      });

      // Retry succeeds
      mockAxios.onGet(endpoint).replyOnce(200, mockApiResponse);

      const response = await apiService.get(endpoint);
      
      expect(response).toEqual(mockApiResponse);
      expect(localStorage.getItem('accessToken')).toBe(newToken);
    });

    it('should validate security headers', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      
      mockAxios.onGet(endpoint).reply(200, mockApiResponse);

      await apiService.get(endpoint);
      
      const headers = mockAxios.history.get[0].headers;
      expect(headers['X-Request-ID']).toBeTruthy();
      expect(headers['X-Timestamp']).toBeTruthy();
      expect(headers['Authorization']).toBe('Bearer mock-token');
    });

    it('should enforce rate limiting', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      let requestCount = 0;

      mockAxios.onGet(endpoint).reply(() => {
        requestCount++;
        return requestCount > API_RATE_LIMITS.TASKS 
          ? [429, mockApiError]
          : [200, mockApiResponse];
      });

      const requests = Array(API_RATE_LIMITS.TASKS + 1)
        .fill(null)
        .map(() => apiService.get(endpoint));

      const results = await Promise.allSettled(requests);
      const rejectedRequests = results.filter(r => r.status === 'rejected');
      
      expect(rejectedRequests.length).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should meet GET request timing requirements', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      
      mockAxios.onGet(endpoint).reply(200, mockApiResponse);

      const startTime = now();
      await apiService.get(endpoint);
      const endTime = now();
      
      expect(endTime - startTime).toBeLessThan(100); // 100ms benchmark
    });

    it('should handle timeout scenarios', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      
      mockAxios.onGet(endpoint).timeout();

      await expect(apiService.get(endpoint)).rejects.toThrow();
    });

    it('should track response time metrics', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      const responseTime = 50;

      mockAxios.onGet(endpoint).reply(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([200, mockApiResponse]), responseTime);
        });
      });

      const startTime = now();
      await apiService.get(endpoint);
      const endTime = now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(responseTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      let attempts = 0;

      mockAxios.onGet(endpoint).reply(() => {
        attempts++;
        return attempts < 3 ? [0, null] : [200, mockApiResponse];
      });

      const response = await apiService.get(endpoint);
      
      expect(response).toEqual(mockApiResponse);
      expect(attempts).toBe(3);
    });

    it('should manage validation errors', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      const validationError = {
        ...mockApiError,
        code: 'VALIDATION_ERROR',
        status: HTTP_STATUS.BAD_REQUEST
      };

      mockAxios.onPost(endpoint).reply(400, validationError);

      await expect(apiService.post(endpoint, {}))
        .rejects
        .toMatchObject({
          code: 'VALIDATION_ERROR',
          status: HTTP_STATUS.BAD_REQUEST
        });
    });

    it('should transform error responses', async () => {
      const endpoint = API_ENDPOINTS.TASKS;
      
      mockAxios.onGet(endpoint).networkError();

      try {
        await apiService.get(endpoint);
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('traceId');
        expect(error).toHaveProperty('timestamp');
      }
    });
  });
});