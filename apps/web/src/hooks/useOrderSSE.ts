import { useEffect, useRef } from 'react';
import { OrderStatus } from '@qr-order/shared-types';
import { useOrderStore } from '../stores/orderStore';

export function useOrderSSE(orderId: string | null) {
  const updateStatus = useOrderStore((s) => s.updateStatus);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let reconnectDelay = 1000;

    const connect = () => {
      const es = new EventSource(`/api/orders/${orderId}/stream`);
      esRef.current = es;

      es.onmessage = (event) => {
        const data = JSON.parse(event.data) as { status: OrderStatus };
        updateStatus(data.status);
        reconnectDelay = 1000;
      };

      es.onerror = () => {
        es.close();
        retryRef.current = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [orderId, updateStatus]);
}
