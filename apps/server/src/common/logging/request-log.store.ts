import { AsyncLocalStorage } from 'async_hooks';
import { LogEvent, LogEventType, RequestLogContext } from './request-log.types';

export const requestLogStorage = new AsyncLocalStorage<RequestLogContext>();

export function getLogContext(): RequestLogContext | undefined {
  return requestLogStorage.getStore();
}

export function addEvent(event: Omit<LogEvent, 'elapsedMs'>): void {
  const ctx = requestLogStorage.getStore();
  if (!ctx) return;
  const elapsedMs = Date.now() - ctx.startedAt.getTime();
  ctx.events.push({ ...event, elapsedMs });
}

export function addCacheEvent(
  type: LogEventType.CACHE_HIT | LogEventType.CACHE_MISS | LogEventType.CACHE_SET | LogEventType.CACHE_DEL,
  key: string,
): void {
  addEvent({ type, label: maskToken(key) });
}

function maskToken(key: string): string {
  const parts = key.split(':');
  if (parts.length >= 3 && parts[parts.length - 1].length > 16) {
    parts[parts.length - 1] = '***';
  }
  return parts.join(':');
}
