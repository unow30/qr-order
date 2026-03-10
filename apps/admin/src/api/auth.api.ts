import client from './client';

export const login = (username: string, password: string): Promise<{ accessToken: string }> =>
  client.post('/auth/login', { username, password });
