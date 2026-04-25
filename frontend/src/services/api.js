import axios from 'axios';

const BASE = '/api/auth';

const api = axios.create({ baseURL: BASE });

// Attach JWT automatically if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

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

  getMe: () => api.get('/me'),

  generateApiKey: () => api.post('/apikey/generate'),

  health: () => api.get('/health'),
};
