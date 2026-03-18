import { useEffect, useState } from 'react';
import { getStores } from '@admin/api/store.api';
import { useAuthStore } from '@admin/stores/authStore';

/**
 * SUPER_ADMIN 전용: storeId → storeName 맵 반환.
 * STORE_ADMIN이면 빈 맵 반환 (불필요).
 */
export function useStoreNames(): Record<string, string> {
  const [storeNameMap, setStoreNameMap] = useState<Record<string, string>>({});
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  useEffect(() => {
    if (!isSuperAdmin) return;
    getStores().then((stores) => {
      const map: Record<string, string> = {};
      stores.forEach((s) => {
        map[s.id] = s.name;
      });
      setStoreNameMap(map);
    });
  }, [isSuperAdmin]);

  return storeNameMap;
}
