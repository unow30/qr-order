import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderSSE } from '@web/hooks/useOrderSSE';
import { OrderStatus } from '@qr-order/shared-types';

class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  simulateMessage(data: unknown) {
    this.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(data) }),
    );
  }

  simulateError() {
    this.onerror?.();
  }

  static instances: MockEventSource[] = [];
  static reset() {
    MockEventSource.instances = [];
  }
}

vi.stubGlobal('EventSource', MockEventSource);

describe('useOrderSSE', () => {
  beforeEach(() => {
    MockEventSource.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('orderId가 null이면 EventSource를 생성하지 않아야 한다', () => {
    renderHook(() => useOrderSSE(null));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('orderId가 있으면 EventSource를 생성해야 한다', () => {
    renderHook(() => useOrderSSE('order-1'));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe(
      '/api/orders/order-1/stream',
    );
  });

  it('메시지를 받으면 onStatusChange 콜백을 호출해야 한다', () => {
    const onStatusChange = vi.fn();

    renderHook(() => useOrderSSE('order-1', onStatusChange));

    const es = MockEventSource.instances[0];
    act(() => {
      es.simulateMessage({ status: OrderStatus.CONFIRMED });
    });

    expect(onStatusChange).toHaveBeenCalledWith(OrderStatus.CONFIRMED);
  });

  it('onStatusChange가 없어도 에러 없이 동작해야 한다', () => {
    renderHook(() => useOrderSSE('order-1'));

    const es = MockEventSource.instances[0];
    expect(() => {
      act(() => {
        es.simulateMessage({ status: OrderStatus.CONFIRMED });
      });
    }).not.toThrow();
  });

  it('에러 발생 시 재연결을 시도해야 한다', () => {
    renderHook(() => useOrderSSE('order-1'));

    expect(MockEventSource.instances).toHaveLength(1);
    const firstEs = MockEventSource.instances[0];

    act(() => {
      firstEs.simulateError();
    });

    expect(firstEs.close).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('재연결 시 지수 백오프를 적용해야 한다', () => {
    renderHook(() => useOrderSSE('order-1'));

    // 첫 번째 에러 → 1초 대기
    act(() => {
      MockEventSource.instances[0].simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockEventSource.instances).toHaveLength(2);

    // 두 번째 에러 → 2초 대기
    act(() => {
      MockEventSource.instances[1].simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(MockEventSource.instances).toHaveLength(2); // 아직 재연결 안됨
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(MockEventSource.instances).toHaveLength(3); // 2초 후 재연결
  });

  it('언마운트 시 EventSource를 닫아야 한다', () => {
    const { unmount } = renderHook(() => useOrderSSE('order-1'));

    const es = MockEventSource.instances[0];
    unmount();

    expect(es.close).toHaveBeenCalled();
  });

  it('성공적인 메시지 수신 후 재연결 딜레이가 리셋되어야 한다', () => {
    renderHook(() => useOrderSSE('order-1'));

    // 에러로 딜레이 증가
    act(() => {
      MockEventSource.instances[0].simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 메시지 수신 → 딜레이 리셋
    act(() => {
      MockEventSource.instances[1].simulateMessage({
        status: OrderStatus.CONFIRMED,
      });
    });

    // 다시 에러 → 1초 대기 (리셋됨)
    act(() => {
      MockEventSource.instances[1].simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockEventSource.instances).toHaveLength(3);
  });
});
