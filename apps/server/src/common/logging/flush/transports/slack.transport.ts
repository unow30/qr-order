import { RequestLogContext, LogEventType } from '../../request-log.types';

export class SlackTransport {
  constructor(private readonly webhookUrl: string) {}

  async send(ctx: RequestLogContext): Promise<void> {
    const isError = (ctx.statusCode ?? 0) >= 500;
    const isSlowRequest = (ctx.durationMs ?? 0) >= parseInt(process.env.LOG_SLOW_REQUEST_MS ?? '3000', 10);

    if (!isError && !isSlowRequest) return;

    const icon = isError ? ':red_circle:' : ':yellow_circle:';
    const title = isError
      ? `[ERROR] ${ctx.method} ${ctx.path}`
      : `[SLOW] ${ctx.method} ${ctx.path}`;

    const mutationEvents = ctx.events.filter((e) => e.type === LogEventType.QUERY_MUTATION);
    const cacheEvents = ctx.events.filter(
      (e) => e.type === LogEventType.CACHE_HIT || e.type === LogEventType.CACHE_MISS,
    );

    const summary = [
      `*Status:* ${ctx.statusCode ?? 'unknown'}  |  *Duration:* ${ctx.durationMs ?? '?'}ms`,
      `*Store:* ${ctx.storeId ?? '-'}  |  *ReqId:* ${ctx.requestId}`,
      ctx.error ? `*Error:* ${ctx.error.message}` : null,
      `*Queries:* ${ctx.events.filter((e) => e.type === LogEventType.QUERY_SELECT || e.type === LogEventType.QUERY_MUTATION).length}  (mutations: ${mutationEvents.length})`,
      `*Cache ops:* ${cacheEvents.length}`,
    ]
      .filter(Boolean)
      .join('\n');

    const payload = {
      text: `${icon} ${title}`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `${icon} *${title}*\n${summary}` },
        },
      ],
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}
