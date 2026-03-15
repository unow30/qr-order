import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { requestLogStorage } from './request-log.store';
import { RequestLogContext } from './request-log.types';
import { LogTransportService } from './log-transport.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly transport: LogTransportService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      storeId?: string;
      user?: { sub?: string };
    }>();

    const ctx: RequestLogContext = {
      requestId: uuidv4(),
      method: request.method,
      path: request.url,
      storeId: request.storeId ?? null,
      userId: request.user?.sub ?? null,
      startedAt: new Date(),
      events: [],
    };

    // X-Request-Id 응답 헤더 설정
    const response = context.switchToHttp().getResponse<{ setHeader: (k: string, v: string) => void }>();
    response.setHeader('X-Request-Id', ctx.requestId);

    let flushed = false;

    const tryFlush = () => {
      if (flushed) return;
      flushed = true;
      // 미들웨어/가드가 실행된 후이므로 storeId, userId 보강
      ctx.storeId = ctx.storeId ?? request.storeId ?? null;
      ctx.userId = ctx.userId ?? request.user?.sub ?? null;
      this.transport.flush(ctx);
    };

    return new Observable((subscriber) => {
      requestLogStorage.run(ctx, () => {
        next
          .handle()
          .pipe(
            tap({
              next: () => {
                const res = context.switchToHttp().getResponse<{ statusCode: number }>();
                ctx.statusCode = res.statusCode;
                ctx.durationMs = Date.now() - ctx.startedAt.getTime();
                tryFlush();
              },
              error: (err: unknown) => {
                ctx.statusCode =
                  err instanceof HttpException
                    ? err.getStatus()
                    : HttpStatus.INTERNAL_SERVER_ERROR;
                ctx.durationMs = Date.now() - ctx.startedAt.getTime();
                ctx.error = {
                  message: err instanceof Error ? err.message : String(err),
                };
                tryFlush();
              },
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
}
