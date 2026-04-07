import axios from 'axios';
import { useAuthStore } from '@admin/stores/authStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

const READONLY_BLOCKED_METHODS = ['post', 'put', 'patch', 'delete'];

client.interceptors.request.use((config) => {
  const { accessToken, currentStoreId, role } = useAuthStore.getState();

  // 읽기 전용 계정: 변경 요청(POST/PUT/PATCH/DELETE) 클라이언트 단계에서 차단
  if (
    role === 'SUPER_ADMIN_READONLY' &&
    config.method &&
    READONLY_BLOCKED_METHODS.includes(config.method.toLowerCase())
  ) {
    if (typeof window !== 'undefined') {
      window.alert('읽기 전용 계정입니다. 데이터 변경 작업은 수행할 수 없습니다.');
    }
    return Promise.reject(
      new axios.Cancel('READONLY_BLOCKED: 읽기 전용 계정은 조회만 가능합니다.'),
    );
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (currentStoreId) {
    config.headers['X-Store-Id'] = currentStoreId;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    if (
      error.response?.status === 403 &&
      useAuthStore.getState().role === 'SUPER_ADMIN_READONLY'
    ) {
      if (typeof window !== 'undefined') {
        window.alert('읽기 전용 계정입니다. 데이터 변경 작업은 수행할 수 없습니다.');
      }
    }
    return Promise.reject(error);
  },
);

export default client;
