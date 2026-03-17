import { RequestLogContext } from '../../request-log.types';

export class LokiTransport {
  constructor(private readonly lokiUrl: string) {}

  async send(ctx: RequestLogContext): Promise<void> {
    const labels: Record<string, string> = {
      app: 'qr-order',
      env: process.env.NODE_ENV ?? 'development',
      method: ctx.method,
      path: this.normalizePath(ctx.path),
      status: String(ctx.statusCode ?? 0),
    };

    if (ctx.storeId) labels['storeId'] = ctx.storeId;

    const logLine = JSON.stringify({
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      status: ctx.statusCode,
      durationMs: ctx.durationMs,
      storeId: ctx.storeId,
      userId: ctx.userId,
      events: ctx.events,
      error: ctx.error,
    });

    // Loki expects nanosecond timestamps as strings
    const tsNs = String(Date.now() * 1_000_000);

    const payload = {
      streams: [
        {
          stream: labels,
          values: [[tsNs, logLine]],
        },
      ],
    };

    await fetch(`${this.lokiUrl}/loki/api/v1/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private normalizePath(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders to reduce cardinality
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }
}
