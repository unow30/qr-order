import client from './client';
import type { AdminRole } from '../stores/authStore';

interface LoginResult {
  accessToken: string;
  role: AdminRole;
  storeId: string | null;
}

/** JWT payload를 디코딩해 role, storeId를 추출한다. */
function decodeJwtPayload(token: string): { role: AdminRole; storeId?: string } {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { role: payload.role, storeId: payload.storeId };
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
  const result = await client.post<unknown, { accessToken: string }>('/auth/login', {
    username,
    password,
  });
  const { role, storeId } = decodeJwtPayload(result.accessToken);
  return { accessToken: result.accessToken, role, storeId: storeId ?? null };
};
