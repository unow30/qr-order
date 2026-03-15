import client from './client';
import type { AdminRole } from '../stores/authStore';

interface LoginResult {
  accessToken: string;
  role: AdminRole;
  storeIds: string[];
}

/** JWT payload를 디코딩해 role, storeIds를 추출한다. */
function decodeJwtPayload(token: string): { role: AdminRole; storeIds?: string[] } {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { role: payload.role, storeIds: payload.storeIds };
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
  const result = await client.post<unknown, { accessToken: string }>('/auth/login', {
    username,
    password,
  });
  const { role, storeIds } = decodeJwtPayload(result.accessToken);
  return { accessToken: result.accessToken, role, storeIds: storeIds ?? [] };
};
