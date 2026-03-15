export enum LogEventType {
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  CACHE_SET = 'cache_set',
  CACHE_DEL = 'cache_del',
  QUERY_SELECT = 'query_select',
  QUERY_MUTATION = 'query_mutation',
  LOGIC = 'logic',
  WARNING = 'warning',
}

export interface LogEvent {
  type: LogEventType;
  label: string;
  detail?: Record<string, unknown>;
  elapsedMs: number;
}

export interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  storeId: string | null;
  userId: string | null;
  startedAt: Date;
  events: LogEvent[];
  statusCode?: number;
  durationMs?: number;
  error?: {
    message: string;
  };
}
