import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@admin/stores/authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  describe('초기 상태', () => {
    it('모든 값이 null/빈 배열이어야 한다', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.username).toBeNull();
      expect(state.role).toBeNull();
      expect(state.storeIds).toEqual([]);
      expect(state.currentStoreId).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('SUPER_ADMIN 로그인 시 currentStoreId가 null이어야 한다', () => {
      useAuthStore.getState().setAuth('token-1', 'admin', 'SUPER_ADMIN', []);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('token-1');
      expect(state.username).toBe('admin');
      expect(state.role).toBe('SUPER_ADMIN');
      expect(state.storeIds).toEqual([]);
      expect(state.currentStoreId).toBeNull();
    });

    it('단일 담당 STORE_ADMIN 로그인 시 currentStoreId가 자동 설정되어야 한다', () => {
      useAuthStore
        .getState()
        .setAuth('token-2', 'store-user', 'STORE_ADMIN', ['store-1']);

      const state = useAuthStore.getState();
      expect(state.role).toBe('STORE_ADMIN');
      expect(state.storeIds).toEqual(['store-1']);
      expect(state.currentStoreId).toBe('store-1');
    });

    it('다중 담당 STORE_ADMIN 로그인 시 currentStoreId가 null이어야 한다', () => {
      useAuthStore
        .getState()
        .setAuth('token-3', 'multi-user', 'STORE_ADMIN', [
          'store-1',
          'store-2',
        ]);

      const state = useAuthStore.getState();
      expect(state.storeIds).toEqual(['store-1', 'store-2']);
      expect(state.currentStoreId).toBeNull();
    });
  });

  describe('setCurrentStoreId', () => {
    it('현재 매장 ID를 변경할 수 있어야 한다', () => {
      useAuthStore.getState().setAuth('token', 'admin', 'SUPER_ADMIN', []);
      useAuthStore.getState().setCurrentStoreId('store-5');

      expect(useAuthStore.getState().currentStoreId).toBe('store-5');
    });

    it('null로 설정하여 선택을 해제할 수 있어야 한다', () => {
      useAuthStore.getState().setAuth('token', 'admin', 'SUPER_ADMIN', []);
      useAuthStore.getState().setCurrentStoreId('store-5');
      useAuthStore.getState().setCurrentStoreId(null);

      expect(useAuthStore.getState().currentStoreId).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('모든 인증 정보를 초기화해야 한다', () => {
      useAuthStore.getState().setAuth('token', 'admin', 'SUPER_ADMIN', []);
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.username).toBeNull();
      expect(state.role).toBeNull();
      expect(state.storeIds).toEqual([]);
      expect(state.currentStoreId).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('토큰이 없으면 false를 반환해야 한다', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('토큰이 있으면 true를 반환해야 한다', () => {
      useAuthStore.getState().setAuth('token', 'admin', 'SUPER_ADMIN', []);
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe('isSuperAdmin', () => {
    it('SUPER_ADMIN이면 true를 반환해야 한다', () => {
      useAuthStore.getState().setAuth('token', 'admin', 'SUPER_ADMIN', []);
      expect(useAuthStore.getState().isSuperAdmin()).toBe(true);
    });

    it('STORE_ADMIN이면 false를 반환해야 한다', () => {
      useAuthStore
        .getState()
        .setAuth('token', 'user', 'STORE_ADMIN', ['store-1']);
      expect(useAuthStore.getState().isSuperAdmin()).toBe(false);
    });

    it('로그인하지 않았으면 false를 반환해야 한다', () => {
      expect(useAuthStore.getState().isSuperAdmin()).toBe(false);
    });
  });
});
