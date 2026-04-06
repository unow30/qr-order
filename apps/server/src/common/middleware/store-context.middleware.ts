import { Injectable, NestMiddleware, ForbiddenException, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { StoreService } from '@server/modules/store/store.service';
import { REDIS_CLIENT } from '@server/config/redis.config';
import { REDIS_KEYS } from '@server/common/redis/redis-keys';
import Redis from 'ioredis';

export interface RequestWithStore extends Request {
  storeId: string | null;
}

@Injectable()
export class StoreContextMiddleware implements NestMiddleware {
  constructor(
    private readonly storeService: StoreService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async use(req: RequestWithStore, _res: Response, next: NextFunction): Promise<void> {
    // SSE 연결처럼 헤더를 추가할 수 없는 경우 쿼리 파라미터로도 수신
    const storeIdHeader = (req.headers['x-store-id'] ?? req.query?.['X-Store-Id']) as string | undefined;

    if (storeIdHeader) {
      const store = await this.storeService.findBySlug(storeIdHeader).catch(() => null)
        ?? await this.storeService.findOne(storeIdHeader).catch(() => null);

      if (!store || !store.isActive) {
        throw new ForbiddenException('유효하지 않거나 비활성화된 매장입니다.');
      }

      req.storeId = store.id;
      return next();
    }

    // X-Store-Id 없으면 세션 토큰으로 storeId 역조회
    const sessionToken = req.headers['x-session-token'] as string | undefined;
    if (sessionToken) {
      const storeId = await this.redis.get(REDIS_KEYS.sessionLookup.key(sessionToken));
      req.storeId = storeId ?? null;
    } else {
      req.storeId = null;
    }

    next();
  }
}
