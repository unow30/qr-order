import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestLogContext, LogEventType } from '../request-log.types';
import { SlackTransport } from './transports/slack.transport';
import { DiscordTransport } from './transports/discord.transport';
import { LokiTransport } from './transports/loki.transport';

const EVENT_ICON: Record<LogEventType, string> = {
  [LogEventType.CACHE_HIT]:      '💾 HIT  ',
  [LogEventType.CACHE_MISS]:     '💾 MISS ',
  [LogEventType.CACHE_SET]:      '💾 SET  ',
  [LogEventType.CACHE_DEL]:      '💾 DEL  ',
  [LogEventType.QUERY_SELECT]:   '🔍 SELECT  ',
  [LogEventType.QUERY_MUTATION]: '✏️  MUTATION',
  [LogEventType.LOGIC]:          '🔧 LOGIC   ',
  [LogEventType.WARNING]:        '⚠️  WARNING ',
};

@Injectable()
export class LogTransportService {
  private readonly isDev: boolean;
  private readonly slack?: SlackTransport;
  private readonly discord?: DiscordTransport;
  private readonly loki?: LokiTransport;

  constructor(private readonly config: ConfigService) {
    this.isDev = config.get<string>('NODE_ENV') !== 'production';

    const slackUrl = config.get<string>('LOG_SLACK_WEBHOOK_URL');
    const discordUrl = config.get<string>('LOG_DISCORD_WEBHOOK_URL');
    const lokiUrl = config.get<string>('LOG_LOKI_URL');

    if (slackUrl) this.slack = new SlackTransport(slackUrl);
    if (discordUrl) this.discord = new DiscordTransport(discordUrl);
    if (lokiUrl) this.loki = new LokiTransport(lokiUrl);
  }

  flush(ctx: RequestLogContext): void {
    this.consoleOutput(ctx);

    // 외부 전송은 비동기로 fire-and-forget (메인 요청 흐름에 영향 없음)
    void this.sendToExternals(ctx);
  }

  private async sendToExternals(ctx: RequestLogContext): Promise<void> {
    await Promise.allSettled([
      this.slack?.send(ctx),
      this.discord?.send(ctx),
      this.loki?.send(ctx),
    ]);
  }

  private consoleOutput(ctx: RequestLogContext): void {
    if (this.isDev) {
      this.prettyPrint(ctx);
    } else {
      this.jsonPrint(ctx);
    }
  }

  private prettyPrint(ctx: RequestLogContext): void {
    const isError = (ctx.statusCode ?? 0) >= 400;
    const divider = '─'.repeat(60);
    const statusIcon = isError ? '✗' : '✓';
    const statusColor = isError ? '\x1b[31m' : '\x1b[32m';
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';
    const bold = '\x1b[1m';

    const lines: string[] = [];
    lines.push(`${divider}`);
    lines.push(
      `${bold}${ctx.method} ${ctx.path}${reset}  ${dim}[${ctx.requestId.substring(0, 8)}]${reset}` +
        (ctx.storeId ? `  storeId: ${ctx.storeId.substring(0, 8)}` : ''),
    );
    lines.push(divider);

    for (const event of ctx.events) {
      const icon = EVENT_ICON[event.type] ?? '   ';
      const ms = `+${event.elapsedMs}ms`.padEnd(8);
      const label = event.label.substring(0, 100);
      let line = `  ${dim}${ms}${reset}  ${icon}  ${label}`;

      if (event.detail && event.type === LogEventType.QUERY_MUTATION) {
        const paramStr = event.detail.params ? ` [params: ${JSON.stringify(event.detail.params).substring(0, 120)}]` : '';
        line += `${dim}${paramStr}${reset}`;
      } else if (event.detail && event.type === LogEventType.LOGIC) {
        line += `  ${dim}${JSON.stringify(event.detail).substring(0, 100)}${reset}`;
      } else if (event.detail && event.type === LogEventType.WARNING) {
        line += `  \x1b[33m${JSON.stringify(event.detail).substring(0, 120)}${reset}`;
      }

      lines.push(line);
    }

    lines.push(divider);
    const queryCount = ctx.events.filter(
      (e) => e.type === LogEventType.QUERY_SELECT || e.type === LogEventType.QUERY_MUTATION,
    ).length;
    const cacheCount = ctx.events.filter(
      (e) => e.type === LogEventType.CACHE_HIT || e.type === LogEventType.CACHE_MISS,
    ).length;

    lines.push(
      `  ${statusColor}${statusIcon} ${ctx.statusCode ?? '?'}${reset}  |  ` +
        `${ctx.durationMs ?? '?'}ms  |  ` +
        `${queryCount} queries  |  ` +
        `${cacheCount} cache ops` +
        (ctx.error ? `  |  ${'\x1b[31m'}${ctx.error.message.substring(0, 80)}${reset}` : ''),
    );
    lines.push(divider);

    console.log(lines.join('\n'));
  }

  private jsonPrint(ctx: RequestLogContext): void {
    const queryCount = ctx.events.filter(
      (e) => e.type === LogEventType.QUERY_SELECT || e.type === LogEventType.QUERY_MUTATION,
    ).length;
    const mutationCount = ctx.events.filter((e) => e.type === LogEventType.QUERY_MUTATION).length;

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        status: ctx.statusCode,
        durationMs: ctx.durationMs,
        storeId: ctx.storeId,
        userId: ctx.userId,
        queryCount,
        mutationCount,
        cacheOps: ctx.events.filter(
          (e) =>
            e.type === LogEventType.CACHE_HIT ||
            e.type === LogEventType.CACHE_MISS ||
            e.type === LogEventType.CACHE_SET ||
            e.type === LogEventType.CACHE_DEL,
        ).length,
        events: ctx.events,
        error: ctx.error,
      }),
    );
  }
}
