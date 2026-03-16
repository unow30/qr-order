import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
  });

  describe('초기 상태', () => {
    it('모든 값이 null이어야 한다', () => {
      const state = useSessionStore.getState();
      expect(state.sessionToken).toBeNull();
      expect(state.tableId).toBeNull();
      expect(state.tableNumber).toBeNull();
      expect(state.tableName).toBeNull();
      expect(state.expiresAt).toBeNull();
    });
  });

  describe('setSession', () => {
    it('세션 데이터를 저장해야 한다', () => {
      useSessionStore.getState().setSession({
        sessionToken: 'token-1',
        tableId: 'table-1',
        tableNumber: 5,
        tableName: '5번 테이블',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });

      const state = useSessionStore.getState();
      expect(state.sessionToken).toBe('token-1');
      expect(state.tableId).toBe('table-1');
      expect(state.tableNumber).toBe(5);
      expect(state.tableName).toBe('5번 테이블');
      expect(state.expiresAt).toBe('2099-01-01T00:00:00.000Z');
    });
  });

  describe('clearSession', () => {
    it('모든 세션 데이터를 초기화해야 한다', () => {
      useSessionStore.getState().setSession({
        sessionToken: 'token-1',
        tableId: 'table-1',
        tableNumber: 5,
        tableName: '5번',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });
      useSessionStore.getState().clearSession();

      const state = useSessionStore.getState();
      expect(state.sessionToken).toBeNull();
      expect(state.tableId).toBeNull();
    });
  });

  describe('isSessionValid', () => {
    it('expiresAt이 없으면 false를 반환해야 한다', () => {
      expect(useSessionStore.getState().isSessionValid()).toBe(false);
    });

    it('만료 시간이 미래이면 true를 반환해야 한다', () => {
      useSessionStore.getState().setSession({
        sessionToken: 'token-1',
        tableId: 'table-1',
        tableNumber: 5,
        tableName: '5번',
        expiresAt: '2099-12-31T23:59:59.000Z',
      });

      expect(useSessionStore.getState().isSessionValid()).toBe(true);
    });

    it('만료 시간이 과거이면 false를 반환해야 한다', () => {
      useSessionStore.getState().setSession({
        sessionToken: 'token-1',
        tableId: 'table-1',
        tableNumber: 5,
        tableName: '5번',
        expiresAt: '2020-01-01T00:00:00.000Z',
      });

      expect(useSessionStore.getState().isSessionValid()).toBe(false);
    });
  });
});
