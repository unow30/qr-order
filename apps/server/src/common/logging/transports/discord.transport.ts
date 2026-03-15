import { RequestLogContext, LogEventType } from '../request-log.types';

const STATUS_COLORS = {
  success: 0x57f287, // green
  slow: 0xfee75c,    // yellow
  error: 0xed4245,   // red
} as const;

export class DiscordTransport {
  constructor(private readonly webhookUrl: string) {}

  async send(ctx: RequestLogContext): Promise<void> {
    const isError = (ctx.statusCode ?? 0) >= 500;
    const isSlowRequest = (ctx.durationMs ?? 0) >= parseInt(process.env.LOG_SLOW_REQUEST_MS ?? '3000', 10);

    if (!isError && !isSlowRequest) return;

    const color = isError ? STATUS_COLORS.error : STATUS_COLORS.slow;
    const queryCount = ctx.events.filter(
      (e) => e.type === LogEventType.QUERY_SELECT || e.type === LogEventType.QUERY_MUTATION,
    ).length;
    const mutationCount = ctx.events.filter((e) => e.type === LogEventType.QUERY_MUTATION).length;

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Method', value: ctx.method, inline: true },
      { name: 'Status', value: String(ctx.statusCode ?? 'unknown'), inline: true },
      { name: 'Duration', value: `${ctx.durationMs ?? '?'}ms`, inline: true },
      { name: 'Store ID', value: ctx.storeId ?? '-', inline: true },
      { name: 'Request ID', value: ctx.requestId, inline: false },
      { name: 'Queries', value: `${queryCount} total (${mutationCount} mutations)`, inline: true },
    ];

    if (ctx.error) {
      fields.push({ name: 'Error', value: ctx.error.message.substring(0, 200), inline: false });
    }

    const payload = {
      embeds: [
        {
          title: `${isError ? '🔴' : '🟡'} ${ctx.method} ${ctx.path}`,
          color,
          fields,
          timestamp: new Date().toISOString(),
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
