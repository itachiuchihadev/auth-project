import axios from 'axios';

const BASE = '/api/auth';

const api = axios.create({ baseURL: BASE });

// Attach JWT automatically if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Handle token refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE}/refresh`, 
            { refreshToken },
            { baseURL: '/' }
          );
          
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/register', data),

  loginJwt: (username, password) =>
    api.post('/login/jwt', { username, password }),

  loginBasic: (username, password) => {
    const encoded = btoa(`${username}:${password}`);
    return api.post('/login/basic', null, {
      headers: { Authorization: `Basic ${encoded}` }
    });
  },

  loginApiKey: (apiKey) =>
    api.post('/login/apikey', { apiKey }),

  loginOAuth: (provider, token) =>
    api.post(`/login/oauth/${provider}`, JSON.stringify(token), {
      headers: { 'Content-Type': 'application/json' }
    }),

  refresh: (refreshToken) =>
    api.post('/refresh', { refreshToken }),

  logout: (refreshToken) =>
    api.post('/logout', refreshToken ? { refreshToken } : null),

  getMe: () => api.get('/me'),

  generateApiKey: () => api.post('/apikey/generate'),

  health: () => api.get('/health'),
};
