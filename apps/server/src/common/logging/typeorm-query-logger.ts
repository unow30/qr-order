import { Logger, QueryRunner } from 'typeorm';
import { addEvent } from './request-log.store';
import { LogEventType } from './request-log.types';

const MUTATION_RE = /^\s*(INSERT|UPDATE|DELETE|TRUNCATE)\b/i;
const SENSITIVE_COLS = /("password"|"token"|"secret")\s*=/gi;

function sanitizeParams(params?: unknown[]): unknown[] | undefined {
  if (!params || params.length === 0) return undefined;
  return params.map((p) =>
    typeof p === 'string' && p.length > 200 ? p.substring(0, 200) + '…' : p,
  );
}

function sanitizeQuery(query: string): string {
  return query.replace(SENSITIVE_COLS, (match) => match.replace(/=.*/, '= [REDACTED]'));
}

export class TypeOrmQueryLogger implements Logger {
  logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    const isMutation = MUTATION_RE.test(query);
    const label = query.replace(/\s+/g, ' ').substring(0, 100) + (query.length > 100 ? '…' : '');

    addEvent({
      type: isMutation ? LogEventType.QUERY_MUTATION : LogEventType.QUERY_SELECT,
      label,
      detail: isMutation
        ? { rawQuery: sanitizeQuery(query), params: sanitizeParams(parameters) }
        : undefined,
    });
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
    _queryRunner?: QueryRunner,
  ): void {
    addEvent({
      type: LogEventType.WARNING,
      label: `Query error: ${query.substring(0, 80)}`,
      detail: {
        error: error instanceof Error ? error.message : error,
        params: sanitizeParams(parameters),
      },
    });
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: unknown[],
    _queryRunner?: QueryRunner,
  ): void {
    addEvent({
      type: LogEventType.WARNING,
      label: `Slow query (${time}ms): ${query.substring(0, 80)}`,
      detail: { time, params: sanitizeParams(parameters) },
    });
  }

  logSchemaBuild(_message: string, _queryRunner?: QueryRunner): void {}
  logMigration(_message: string, _queryRunner?: QueryRunner): void {}

  log(
    _level: 'log' | 'info' | 'warn',
    _message: unknown,
    _queryRunner?: QueryRunner,
  ): void {}
}
