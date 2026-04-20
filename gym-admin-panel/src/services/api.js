import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const api = axios.create({
  // Frontend and API are served from same domain via nginx reverse proxy.
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expired / invalid token → clear auth + bounce to /login. Skip when the
// failing call was /auth/login itself so wrong-password stays on the form.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      removeToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default api;