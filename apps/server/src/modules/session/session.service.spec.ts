import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '@server/modules/session/session.service';
import { TableService } from '@server/modules/table/table.service';
import { REDIS_CLIENT } from '@server/config/redis.config';

jest.mock('uuid', () => ({ v4: () => 'mock-session-token' }));

describe('SessionService', () => {
  let service: SessionService;
  let redis: Record<string, jest.Mock>;
  let tableService: { validateQrToken: jest.Mock };

  beforeEach(async () => {
    redis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(7200),
    };

    tableService = {
      validateQrToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: TableService, useValue: tableService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(7200) },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe('getSessionKey', () => {
    it('올바른 키 형식을 반환해야 한다', () => {
      expect(service.getSessionKey('store-1', 'token-abc')).toBe(
        'session:store-1:token-abc',
      );
    });
  });

  describe('createSession', () => {
    it('유효한 QR 토큰으로 세션을 생성해야 한다', async () => {
      tableService.validateQrToken.mockResolvedValue({
        id: 'table-1',
        storeId: 'store-1',
        tableNumber: 5,
        name: '5번 테이블',
      });

      const result = await service.createSession({
        tableId: 'table-1',
        qrToken: 'valid-qr-token',
      });

      expect(result.sessionToken).toBe('mock-session-token');
      expect(result.tableId).toBe('table-1');
      expect(result.tableNumber).toBe(5);
      expect(redis.setex).toHaveBeenCalledTimes(2);
      // session 키
      expect(redis.setex).toHaveBeenCalledWith(
        'session:store-1:mock-session-token',
        7200,
        expect.any(String),
      );
      // lookup 키
      expect(redis.setex).toHaveBeenCalledWith(
        'session-lookup:mock-session-token',
        7200,
        'store-1',
      );
    });

    it('유효하지 않은 QR 토큰이면 BadRequestException을 던져야 한다', async () => {
      tableService.validateQrToken.mockResolvedValue(null);

      await expect(
        service.createSession({ tableId: 'table-1', qrToken: 'invalid' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateSession', () => {
    it('유효한 세션을 반환해야 한다', async () => {
      const sessionData = {
        sessionToken: 'token-1',
        storeId: 'store-1',
        tableId: 'table-1',
        tableNumber: 5,
        tableName: '5번 테이블',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-01-01T02:00:00.000Z',
      };
      redis.get
        .mockResolvedValueOnce('store-1') // lookup 키
        .mockResolvedValueOnce(JSON.stringify(sessionData)); // session 키

      const result = await service.validateSession('token-1');
      expect(result).toEqual(sessionData);
    });

    it('lookup 키가 없으면 UnauthorizedException을 던져야 한다', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.validateSession('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('session 키가 없으면 UnauthorizedException을 던져야 한다', async () => {
      redis.get
        .mockResolvedValueOnce('store-1') // lookup 있음
        .mockResolvedValueOnce(null); // session 없음

      await expect(service.validateSession('token-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('renewSession', () => {
    it('세션과 lookup 키의 TTL을 갱신해야 한다', async () => {
      redis.get.mockResolvedValue('store-1');

      await service.renewSession('token-1');

      expect(redis.expire).toHaveBeenCalledWith(
        'session:store-1:token-1',
        7200,
      );
      expect(redis.expire).toHaveBeenCalledWith(
        'session-lookup:token-1',
        7200,
      );
    });

    it('lookup 키가 없으면 아무것도 하지 않아야 한다', async () => {
      redis.get.mockResolvedValue(null);

      await service.renewSession('expired-token');

      expect(redis.expire).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('세션과 lookup 키를 삭제해야 한다', async () => {
      redis.get.mockResolvedValue('store-1');

      await service.deleteSession('token-1');

      expect(redis.del).toHaveBeenCalledWith('session:store-1:token-1');
      expect(redis.del).toHaveBeenCalledWith('session-lookup:token-1');
    });

    it('lookup 키가 없으면 아무것도 하지 않아야 한다', async () => {
      redis.get.mockResolvedValue(null);

      await service.deleteSession('expired-token');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
