import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminRole } from '@qr-order/shared-types';

/**
 * JWT 인증 후 role을 확인하는 Guard.
 * JwtAuthGuard와 함께 사용해야 한다.
 *
 * @Roles('SUPER_ADMIN') → SUPER_ADMIN만 허용
 * @Roles('STORE_ADMIN', 'SUPER_ADMIN') → 두 role 모두 허용
 *
 * 추가로 STORE_ADMIN이 다른 매장의 데이터에 접근하지 못하도록
 * req.storeId vs user.storeId를 검증한다.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      user: { userId: string; username: string; role: AdminRole; storeIds: string[] };
      storeId: string | null;
    }>();

    const user = request.user;
    if (!user) return false;

    // role 검사
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException('접근 권한이 없습니다.');
      }
    }

    // STORE_ADMIN이 담당하지 않는 매장 데이터 접근 차단
    if (user.role === 'STORE_ADMIN' && request.storeId) {
      if (!user.storeIds?.includes(request.storeId)) {
        throw new ForbiddenException('본인 담당 매장의 데이터만 접근할 수 있습니다.');
      }
    }

    return true;
  }
}
