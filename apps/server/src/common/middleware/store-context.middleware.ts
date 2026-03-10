import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../../modules/store/store.service';

export interface RequestWithStore extends Request {
  storeId: string | null;
}

@Injectable()
export class StoreContextMiddleware implements NestMiddleware {
  constructor(private readonly storeService: StoreService) {}

  async use(req: RequestWithStore, _res: Response, next: NextFunction): Promise<void> {
    const storeIdHeader = req.headers['x-store-id'] as string | undefined;

    if (!storeIdHeader) {
      req.storeId = null;
      return next();
    }

    const store = await this.storeService.findBySlug(storeIdHeader).catch(() => null)
      ?? await this.storeService.findOne(storeIdHeader).catch(() => null);

    if (!store || !store.isActive) {
      throw new ForbiddenException('유효하지 않거나 비활성화된 매장입니다.');
    }

    req.storeId = store.id;
    next();
  }
}
