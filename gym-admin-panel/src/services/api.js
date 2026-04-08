import axios from 'axios';
import { getToken } from '../utils/auth';

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

export default api;