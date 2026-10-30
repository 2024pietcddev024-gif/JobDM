/**
 * Enterprise API Client for JobDM / InterviewIQ
 * Provides centralized network communications, automatic JWT injection,
 * unified error normalization, and standard single-origin fallback.
 */

// Default to relative '/api' for universal compatibility across local Vite proxies,
// Vercel serverless rewrites, and custom reverse-proxy topologies.
export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

/**
 * Normalizes HTTP response errors into clean human-readable messages.
 * Handles JSON errors, raw text, and HTML error pages (e.g., 502/504 Bad Gateway).
 */
export async function extractErrorMessage(response, defaultMsg = 'An unexpected server error occurred.') {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data.error || data.message || defaultMsg;
    }
    const text = await response.text();
    if (text && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
      return text.trim();
    }
  } catch (_) {}

  if (response.status === 401) return 'Session expired or invalid credentials. Please sign in again.';
  if (response.status === 403) return 'You do not have permission to perform this action.';
  if (response.status === 404) return 'The requested resource or endpoint was not found.';
  if (response.status >= 500) return 'Backend service is currently unavailable. Please verify the server is active.';

  return defaultMsg;
}

/**
 * Centralized fetch wrapper with automatic JWT authorization and JSON parsing.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('interviewiq_token');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  const headers = {
    'Accept': 'application/json',
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        // Dispatch session expired event for clean global handling
        window.dispatchEvent(new CustomEvent('jobdm:session_expired'));
      }
      const errorMsg = await extractErrorMessage(response);
      const err = new Error(errorMsg);
      err.status = response.status;
      err.response = response;
      throw err;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      const networkErr = new Error('Network error: Unable to reach the backend service. Check your connection or server status.');
      networkErr.status = 0;
      throw networkErr;
    }
    throw error;
  }
}

export const apiClient = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PATCH', body })
};

export default apiClient;
