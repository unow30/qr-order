import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Observable, from, switchMap, finalize } from 'rxjs';
import { Request } from 'express';

interface RequestWithStoreId extends Request {
  storeId?: string;
  user?: { role?: string; storeId?: string };
}

/**
 * F8: RLS 세션 변수 주입 인터셉터
 *
 * 모든 요청 핸들러 실행 전에 PostgreSQL 세션 변수를 설정합니다:
 *   SET app.store_id = '{storeId}'
 *   SET app.role = '{role}'
 *
 * 이 값이 RLS 정책(`store_isolation`)에서 참조됩니다.
 * 요청 종료 후 빈 값으로 리셋하여 커넥션 풀 오염을 방지합니다.
 *
 * 주의: TypeORM synchronize 모드의 스키마 변경 쿼리는 RLS 밖에서 실행됩니다.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithStoreId>();
    const storeId = req.storeId ?? req.user?.storeId ?? '';
    const role = req.user?.role ?? '';

    return from(this.setRlsVariables(storeId, role)).pipe(
      switchMap(() => next.handle()),
      finalize(() => {
        // 요청 완료 후 비동기 리셋 (오류 무시)
        this.clearRlsVariables().catch(() => {});
      }),
    );
  }

  private async setRlsVariables(storeId: string, role: string): Promise<void> {
    await this.dataSource.query(
      `SELECT set_config('app.store_id', $1, false), set_config('app.role', $2, false)`,
      [storeId, role],
    );
  }

  private async clearRlsVariables(): Promise<void> {
    await this.dataSource.query(
      `SELECT set_config('app.store_id', '', false), set_config('app.role', '', false)`,
    );
  }
}
