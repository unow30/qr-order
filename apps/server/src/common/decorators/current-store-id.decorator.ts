import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * req.storeId (StoreContextMiddleware 설정) 또는
 * req.user.storeIds (JWT 클레임)에서 storeId를 추출한다.
 *
 * - X-Store-Id 헤더가 있으면 해당 값 사용
 * - 없으면 STORE_ADMIN이 담당 매장 1개일 경우 자동 반환
 * - required: true (기본값) → storeId가 없으면 BadRequestException
 */
export const CurrentStoreId = createParamDecorator(
  (required: boolean = true, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{
      storeId?: string | null;
      user?: { storeIds?: string[] };
    }>();

    const storeId = request.storeId ?? null;

    if (!storeId) {
      // STORE_ADMIN이 담당 매장 1개만 있는 경우 자동 선택
      const userStoreIds = request.user?.storeIds ?? [];
      if (userStoreIds.length === 1) return userStoreIds[0];

      if (required) {
        throw new BadRequestException('X-Store-Id 헤더가 필요합니다.');
      }
      return null;
    }

    return storeId;
  },
);
