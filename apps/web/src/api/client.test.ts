import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useSessionStore } from '../stores/sessionStore';

const server = setupServer(
  http.get('/api/test', () => {
    return HttpResponse.json({ data: { message: 'ok' } });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let client: typeof import('./client').default;

describe('Web API Client', () => {
  beforeEach(async () => {
    useSessionStore.getState().clearSession();
    const mod = await import('./client');
    client = mod.default;
  });

  it('sessionToken이 있으면 X-Session-Token 헤더를 포함해야 한다', async () => {
    let capturedToken: string | null = null;
    server.use(
      http.get('/api/test', ({ request }) => {
        capturedToken = request.headers.get('x-session-token');
        return HttpResponse.json({ data: { message: 'ok' } });
      }),
    );

    useSessionStore.getState().setSession({
      sessionToken: 'session-abc',
      tableId: 'table-1',
      tableNumber: 5,
      tableName: '5번',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    await client.get('/test');

    expect(capturedToken).toBe('session-abc');
  });

  it('sessionToken이 없으면 X-Session-Token 헤더를 보내지 않아야 한다', async () => {
    let capturedToken: string | null = null;
    server.use(
      http.get('/api/test', ({ request }) => {
        capturedToken = request.headers.get('x-session-token');
        return HttpResponse.json({ data: { message: 'ok' } });
      }),
    );

    await client.get('/test');

    expect(capturedToken).toBeNull();
  });

  it('응답에서 data 필드를 추출해야 한다', async () => {
    const result = await client.get('/test');
    expect(result).toEqual({ message: 'ok' });
  });

  it('에러 응답을 reject해야 한다', async () => {
    server.use(
      http.get('/api/test', () => {
        return HttpResponse.json({ message: 'error' }, { status: 500 });
      }),
    );

    await expect(client.get('/test')).rejects.toThrow();
  });
});
