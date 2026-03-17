import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * 어드민/KDS용 전체 주문 변경 SSE 훅.
 * 주문 상태가 변경될 때마다 onUpdate 콜백을 호출한다.
 * EventSource는 커스텀 헤더를 지원하지 않으므로 JWT를 쿼리 파라미터로 전달한다.
 */
export function useOrdersSSE(onUpdate: () => void) {
  const { accessToken, currentStoreId } = useAuthStore();
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!accessToken) return;

    let reconnectDelay = 1000;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      const params = new URLSearchParams({ token: accessToken });
      if (currentStoreId) params.set('X-Store-Id', currentStoreId);

      const es = new EventSource(`/api/orders/stream/all?${params.toString()}`);
      esRef.current = es;

      es.onmessage = () => {
        onUpdateRef.current();
        reconnectDelay = 1000;
      };

      es.onerror = () => {
        es.close();
        if (!destroyed) {
          retryRef.current = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            connect();
          }, reconnectDelay);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [accessToken, currentStoreId]);
}
