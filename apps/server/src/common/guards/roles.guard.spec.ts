import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@server/common/guards/roles.guard';
import { ROLES_KEY } from '@server/common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(
    user: any,
    storeId: string | null = null,
  ): ExecutionContext {
    const request = { user, storeId };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ExecutionContext;
  }

  it('user가 없으면 false를 반환해야 한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(null);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('requiredRoles가 없으면 인증된 사용자를 허용해야 한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({
      userId: '1',
      username: 'admin',
      role: 'SUPER_ADMIN',
      storeIds: [],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('SUPER_ADMIN은 SUPER_ADMIN 전용 엔드포인트에 접근할 수 있어야 한다', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext({
      userId: '1',
      username: 'admin',
      role: 'SUPER_ADMIN',
      storeIds: [],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('STORE_ADMIN은 SUPER_ADMIN 전용 엔드포인트에 접근할 수 없어야 한다', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext({
      userId: '2',
      username: 'store-admin',
      role: 'STORE_ADMIN',
      storeIds: ['store-1'],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('STORE_ADMIN은 담당 매장에 접근할 수 있어야 한다', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['STORE_ADMIN', 'SUPER_ADMIN']);
    const context = createMockContext(
      {
        userId: '2',
        username: 'store-admin',
        role: 'STORE_ADMIN',
        storeIds: ['store-1', 'store-2'],
      },
      'store-1',
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('STORE_ADMIN은 담당하지 않는 매장에 접근할 수 없어야 한다', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['STORE_ADMIN', 'SUPER_ADMIN']);
    const context = createMockContext(
      {
        userId: '2',
        username: 'store-admin',
        role: 'STORE_ADMIN',
        storeIds: ['store-1'],
      },
      'store-999',
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('SUPER_ADMIN은 storeId가 있어도 매장 접근 제한을 받지 않아야 한다', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['SUPER_ADMIN', 'STORE_ADMIN']);
    const context = createMockContext(
      {
        userId: '1',
        username: 'admin',
        role: 'SUPER_ADMIN',
        storeIds: [],
      },
      'any-store',
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
