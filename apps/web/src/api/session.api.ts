import client from '@web/api/client';
import { CreateSessionDto, JoinSessionDto, SessionResponse } from '@qr-order/shared-types';

export const createSession = (dto: CreateSessionDto): Promise<SessionResponse> =>
  client.post('/sessions', dto);

export const joinSession = (dto: JoinSessionDto): Promise<SessionResponse> =>
  client.post('/sessions/join', dto);
