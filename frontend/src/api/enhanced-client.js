/**
 * Enhanced API client with request queue, retry logic, and error handling.
 */

import axios from 'axios';

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Request queue for managing concurrent requests.
 * Useful for batching requests and preventing race conditions.
 */
class RequestQueue {
  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.running = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      this.running++;
      const { fn, resolve, reject } = this.queue.shift();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        this.process();
      }
    }
  }
}

const requestQueue = new RequestQueue();

/**
 * Create enhanced axios client with interceptors.
 */
function createApiClient() {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/',
    timeout: DEFAULT_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  /**
   * Request interceptor for adding auth tokens and logging.
   */
  client.interceptors.request.use(
    (config) => {
      // Add request ID for tracing
      config.headers['X-Request-ID'] = generateRequestId();

      // Log request in development
      if (import.meta.env.DEV) {
        console.debug(`[${config.method.toUpperCase()}] ${config.url}`);
      }

      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor for handling errors and token refresh.
   */
  client.interceptors.response.use(
    (response) => {
      // Log successful response in development
      if (import.meta.env.DEV) {
        console.debug(`✓ [${response.status}] ${response.config.url}`);
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          console.debug('Attempting token refresh...');
          await client.post('/api/auth/refresh/', null);
          return client(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear auth and redirect to login
          clearAuth();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Log error response
      console.error(
        `✗ [${error.response?.status || 'ERR'}] ${originalRequest.url}`,
        error.response?.data || error.message
      );

      return Promise.reject(error);
    }
  );

  return client;
}

const client = createApiClient();

/**
 * Perform request with automatic retry logic.
 */
export async function apiRequest(
  method,
  url,
  data = null,
  options = {}
) {
  const {
    retries = MAX_RETRIES,
    delay = RETRY_DELAY,
    useQueue = true,
  } = options;

  const makeRequest = async () => {
    try {
      const config = {
        method,
        url,
        ...options,
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }

      const response = await client(config);
      return response;
    } catch (error) {
      // Retry logic for 5xx errors and network errors
      if (
        retries > 0 &&
        (!error.response || error.response.status >= 500)
      ) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiRequest(method, url, data, {
          ...options,
          retries: retries - 1,
          delay: delay * 2, // Exponential backoff
        });
      }
      throw error;
    }
  };

  if (useQueue) {
    return requestQueue.add(makeRequest);
  }
  return makeRequest();
}

/**
 * GET request helper.
 */
export async function get(url, options = {}) {
  try {
    const response = await apiRequest('GET', url, null, options);
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST request helper.
 */
export async function post(url, data, options = {}) {
  try {
    const response = await apiRequest('POST', url, data, options);
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT request helper.
 */
export async function put(url, data, options = {}) {
  try {
    const response = await apiRequest('PUT', url, data, options);
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH request helper.
 */
export async function patch(url, data, options = {}) {
  try {
    const response = await apiRequest('PATCH', url, data, options);
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE request helper.
 */
export async function del(url, options = {}) {
  try {
    const response = await apiRequest('DELETE', url, null, options);
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handle API errors uniformly.
 */
function handleApiError(error) {
  const status = error.response?.status || 0;
  const data = error.response?.data || {};

  return {
    ok: false,
    status,
    data: {
      error: data.error || getErrorMessage(status),
      error_code: data.error_code || 'UNKNOWN_ERROR',
      details: data.details || null,
    },
  };
}

/**
 * Get user-friendly error message by status code.
 */
function getErrorMessage(status) {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Session expired. Please login again.',
    403: 'You do not have permission for this action.',
    404: 'Resource not found.',
    409: 'Resource already exists.',
    422: 'Validation failed. Please check the form.',
    429: 'Too many requests. Please try again later.',
    500: 'Server error. Please try again later.',
    503: 'Service unavailable. Please try again later.',
  };
  return messages[status] || 'An unexpected error occurred.';
}

/**
 * Generate unique request ID for tracing.
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear authentication data.
 */
function clearAuth() {
  localStorage.removeItem('auth_tokens');
  localStorage.removeItem('auth_user');
}

/**
 * Batch multiple requests with request queue.
 */
export async function batch(requests) {
  return Promise.all(
    requests.map(({ method, url, data, options }) =>
      apiRequest(method, url, data, { ...options, useQueue: true })
    )
  );
}

export default client;
