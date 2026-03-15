import { Injectable } from '@nestjs/common';
import { addEvent } from './request-log.store';
import { LogEventType } from './request-log.types';

@Injectable()
export class LogEventService {
  logic(label: string, detail?: Record<string, unknown>): void {
    addEvent({ type: LogEventType.LOGIC, label, detail });
  }

  warning(label: string, detail?: Record<string, unknown>): void {
    addEvent({ type: LogEventType.WARNING, label, detail });
  }
}
