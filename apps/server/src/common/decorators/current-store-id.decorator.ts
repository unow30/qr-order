import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * req.storeId (StoreContextMiddleware 설정) 또는
 * req.user.storeId (STORE_ADMIN JWT 클레임)에서 storeId를 추출한다.
 *
 * required: true (기본값) → storeId가 없으면 BadRequestException
 */
export const CurrentStoreId = createParamDecorator(
  (required: boolean = true, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{
      storeId?: string | null;
      user?: { storeId?: string | null };
    }>();

    const storeId = request.storeId ?? request.user?.storeId ?? null;

    if (required && !storeId) {
      throw new BadRequestException('X-Store-Id 헤더 또는 어드민 계정의 storeId가 필요합니다.');
    }

    return storeId;
  },
);
