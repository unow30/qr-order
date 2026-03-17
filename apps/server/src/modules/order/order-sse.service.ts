import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { OrderSseEvent } from '@qr-order/shared-types';

interface SseMessage {
  orderId: string;
  event: OrderSseEvent;
}

@Injectable()
export class OrderSseService {
  private readonly subject = new Subject<SseMessage>();

  emit(orderId: string, event: OrderSseEvent): void {
    this.subject.next({ orderId, event });
  }

  getStream(orderId: string): Observable<MessageEvent> {
    return this.subject.asObservable().pipe(
      filter((msg) => msg.orderId === orderId),
      map((msg) => new MessageEvent('message', { data: JSON.stringify(msg.event) })),
    );
  }

  /** 어드민/KDS용: storeId가 일치하는 모든 주문 변경 이벤트를 스트리밍 */
  getStoreStream(storeId: string | null): Observable<MessageEvent> {
    return this.subject.asObservable().pipe(
      filter((msg) => storeId === null || msg.event.storeId === storeId),
      map((msg) => new MessageEvent('message', { data: JSON.stringify(msg.event) })),
    );
  }
}
