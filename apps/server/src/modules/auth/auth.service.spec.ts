import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AdminEntity } from './entities/admin.entity';
import { StoreEntity } from '../store/entities/store.entity';
import {
  createMockRepository,
  MockRepository,
} from '../../../test/helpers/mock-repository';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let adminRepo: MockRepository<AdminEntity>;
  let storeRepo: MockRepository<StoreEntity>;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    adminRepo = createMockRepository<AdminEntity>();
    storeRepo = createMockRepository<StoreEntity>();
    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(AdminEntity), useValue: adminRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultVal: any) => defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('onModuleInit', () => {
    it('어드민이 없으면 SUPER_ADMIN을 자동 생성해야 한다', async () => {
      adminRepo.count!.mockResolvedValue(0);

      await service.onModuleInit();

      expect(adminRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          password: 'hashed-password',
          role: 'SUPER_ADMIN',
        }),
      );
      expect(adminRepo.save).toHaveBeenCalled();
    });

    it('어드민이 이미 있으면 생성하지 않아야 한다', async () => {
      adminRepo.count!.mockResolvedValue(1);

      await service.onModuleInit();

      expect(adminRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('올바른 자격 증명으로 사용자 정보를 반환해야 한다', async () => {
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        username: 'admin',
        password: 'hashed-pw',
        role: 'SUPER_ADMIN',
        stores: [],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('admin', 'admin1234');

      expect(result).toEqual({
        id: 'admin-1',
        username: 'admin',
        role: 'SUPER_ADMIN',
        stores: [],
      });
    });

    it('사용자가 존재하지 않으면 null을 반환해야 한다', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      const result = await service.validateUser('unknown', 'pass');

      expect(result).toBeNull();
    });

    it('비밀번호가 틀리면 null을 반환해야 한다', async () => {
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        username: 'admin',
        password: 'hashed-pw',
        role: 'SUPER_ADMIN',
        stores: [],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('admin', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('JWT 토큰을 반환해야 한다', () => {
      const result = service.login({
        id: 'admin-1',
        username: 'admin',
        role: 'SUPER_ADMIN',
        stores: [{ id: 'store-1' } as StoreEntity],
      });

      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'admin-1',
        username: 'admin',
        role: 'SUPER_ADMIN',
        storeIds: ['store-1'],
      });
    });
  });

  describe('createAdmin', () => {
    it('STORE_ADMIN 생성 시 storeIds가 없으면 BadRequestException을 던져야 한다', async () => {
      await expect(
        service.createAdmin({
          username: 'new-admin',
          password: 'pass',
          role: 'STORE_ADMIN',
          storeIds: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('이미 존재하는 사용자명이면 ConflictException을 던져야 한다', async () => {
      adminRepo.findOne!.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createAdmin({
          username: 'admin',
          password: 'pass',
          role: 'SUPER_ADMIN',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('STORE_ADMIN을 생성하고 매장을 연결해야 한다', async () => {
      adminRepo.findOne!.mockResolvedValue(null); // 중복 없음
      storeRepo.findBy!.mockResolvedValue([
        { id: 'store-1' },
        { id: 'store-2' },
      ]);
      adminRepo.save!.mockResolvedValue({
        id: 'new-admin-1',
        username: 'store-user',
        password: 'hashed-password',
        role: 'STORE_ADMIN',
        stores: [{ id: 'store-1' }, { id: 'store-2' }],
      });

      const result = await service.createAdmin({
        username: 'store-user',
        password: 'pass',
        role: 'STORE_ADMIN',
        storeIds: ['store-1', 'store-2'],
      });

      expect(result).not.toHaveProperty('password');
      expect(adminRepo.save).toHaveBeenCalled();
    });

    it('SUPER_ADMIN을 생성할 수 있어야 한다', async () => {
      adminRepo.findOne!.mockResolvedValue(null);
      adminRepo.save!.mockResolvedValue({
        id: 'new-admin-2',
        username: 'super-user',
        password: 'hashed-password',
        role: 'SUPER_ADMIN',
        stores: [],
      });

      const result = await service.createAdmin({
        username: 'super-user',
        password: 'pass',
        role: 'SUPER_ADMIN',
      });

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('findAllAdmins', () => {
    it('비밀번호를 제외한 어드민 목록을 반환해야 한다', async () => {
      adminRepo.find!.mockResolvedValue([
        {
          id: 'admin-1',
          username: 'admin',
          password: 'secret',
          role: 'SUPER_ADMIN',
          stores: [],
        },
      ]);

      const result = await service.findAllAdmins();

      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].username).toBe('admin');
    });
  });
});
