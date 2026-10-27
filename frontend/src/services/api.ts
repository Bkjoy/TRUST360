import axios from 'axios';

// Backend deployed on Render: https://trust360.onrender.com
const DEFAULT_PROD_BACKEND = 'https://trust360.onrender.com';

const rawApiUrl =
  (import.meta as any).env?.VITE_API_URL ||
  ((import.meta as any).env?.PROD ? DEFAULT_PROD_BACKEND : undefined);

export const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api/v1`)
  : '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trust_token') || localStorage.getItem('deposit360_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('trust_token');
      localStorage.removeItem('trust_user');
      localStorage.removeItem('deposit360_token');
      localStorage.removeItem('deposit360_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
