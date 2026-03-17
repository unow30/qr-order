import Redis from 'ioredis';
import { addCacheEvent } from '../request-log.store';
import { LogEventType } from '../request-log.types';

const READ_CMDS = new Set(['get', 'hget', 'hgetall', 'hmget']);
const WRITE_CMDS = new Set(['set', 'setex', 'psetex', 'setnx', 'hset', 'hmset']);
const DELETE_CMDS = new Set(['del', 'unlink', 'hdel']);

export function createRedisLoggerProxy(client: Redis): Redis {
  return new Proxy(client, {
    get(target: Redis, prop: string | symbol) {
      const original = (target as unknown as Record<string | symbol, unknown>)[prop];

      if (typeof original !== 'function' || typeof prop !== 'string') {
        return original;
      }

      if (READ_CMDS.has(prop)) {
        return async (...args: unknown[]) => {
          const result = await (original as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          const key = String(args[0] ?? '');
          addCacheEvent(result !== null ? LogEventType.CACHE_HIT : LogEventType.CACHE_MISS, key);
          return result;
        };
      }

      if (WRITE_CMDS.has(prop)) {
        return async (...args: unknown[]) => {
          const result = await (original as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          const key = String(args[0] ?? '');
          addCacheEvent(LogEventType.CACHE_SET, key);
          return result;
        };
      }

      if (DELETE_CMDS.has(prop)) {
        return async (...args: unknown[]) => {
          const result = await (original as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          const key = String(args[0] ?? '');
          addCacheEvent(LogEventType.CACHE_DEL, key);
          return result;
        };
      }

      return (original as Function).bind(target);
    },
  });
}
