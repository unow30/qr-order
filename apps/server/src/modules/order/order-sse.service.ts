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
      map((msg) => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify(msg.event),
        });
        return messageEvent;
      }),
    );
  }
}
