import client from '@web/api/client';
import { CreateSessionDto, SessionResponse } from '@qr-order/shared-types';

export const createSession = (dto: CreateSessionDto): Promise<SessionResponse> =>
  client.post('/sessions', dto);
