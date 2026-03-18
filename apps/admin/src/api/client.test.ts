import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useAuthStore } from '@admin/stores/authStore';

const server = setupServer(
  http.get('/api/test', () => {
    return HttpResponse.json({ data: { message: 'ok' } });
  }),
  http.get('/api/unauthorized', () => {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// client를 동적 import하여 msw가 먼저 설정되도록 함
let client: typeof import('./client').default;

describe('Admin API Client', () => {
  beforeEach(async () => {
    useAuthStore.getState().clearAuth();
    // 매번 새로 import하여 인터셉터 상태 초기화
    const mod = await import('./client');
    client = mod.default;
  });

  it('accessToken이 있으면 Authorization 헤더를 포함해야 한다', async () => {
    let capturedAuth: string | undefined;
    server.use(
      http.get('/api/test', ({ request }) => {
        capturedAuth = request.headers.get('authorization') ?? undefined;
        return HttpResponse.json({ data: { message: 'ok' } });
      }),
    );

    useAuthStore.getState().setAuth('my-token', 'admin', 'SUPER_ADMIN', []);
    await client.get('/test');

    expect(capturedAuth).toBe('Bearer my-token');
  });

  it('currentStoreId가 있으면 X-Store-Id 헤더를 포함해야 한다', async () => {
    let capturedStoreId: string | null = null;
    server.use(
      http.get('/api/test', ({ request }) => {
        capturedStoreId = request.headers.get('x-store-id');
        return HttpResponse.json({ data: { message: 'ok' } });
      }),
    );

    useAuthStore.getState().setAuth('token', 'admin', 'SUPER_ADMIN', []);
    useAuthStore.getState().setCurrentStoreId('store-123');
    await client.get('/test');

    expect(capturedStoreId).toBe('store-123');
  });

  it('인증 정보가 없으면 Authorization 헤더를 보내지 않아야 한다', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get('/api/test', ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json({ data: { message: 'ok' } });
      }),
    );

    await client.get('/test');

    expect(capturedAuth).toBeNull();
  });

  it('응답에서 data 필드를 추출해야 한다', async () => {
    const result = await client.get('/test');
    expect(result).toEqual({ message: 'ok' });
  });

  it('401 응답 시 에러를 reject해야 한다', async () => {
    await expect(client.get('/unauthorized')).rejects.toThrow();
  });
});
