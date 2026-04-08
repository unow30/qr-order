import axios from 'axios';
import { useSessionStore } from '@web/stores/sessionStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const sessionToken = useSessionStore.getState().sessionToken;
  if (sessionToken) {
    config.headers['X-Session-Token'] = sessionToken;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    if (error?.response?.status === 401) {
      useSessionStore.getState().clearSession();
      const path = window.location.pathname;
      if (path !== '/store' && path !== '/entry') {
        window.location.href = '/store';
      }
    }
    return Promise.reject(error);
  },
);

export default client;
