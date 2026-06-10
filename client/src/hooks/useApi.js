import { useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE = '/api';

export function useApi() {
  const { token } = useAuth();

  const request = useCallback(async (path, options = {}) => {
    const headers = { ...options.headers };
    let body = options.body;
    
    // اگر body از نوع FormData نبود و body وجود داشت، آن را به JSON تبدیل کن
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body,
    });
    
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        errorMsg = data.message || errorMsg;
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        errorMsg = res.statusText || errorMsg;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  }, [token]);

  const get = useCallback((path) => request(path), [request]);
  const post = useCallback((path, body, customHeaders = {}) => request(path, { method: 'POST', body, headers: customHeaders }), [request]);
  const del = useCallback((path) => request(path, { method: 'DELETE' }), [request]);

  return { get, post, del };
}