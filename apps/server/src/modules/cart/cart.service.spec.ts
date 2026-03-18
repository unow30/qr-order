import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartService } from '@server/modules/cart/cart.service';
import { SessionService } from '@server/modules/session/session.service';
import { MenuItem } from '@server/modules/menu/entities/menu-item.entity';
import { REDIS_CLIENT } from '@server/config/redis.config';
import { createMockRepository, MockRepository } from '../../../test/helpers/mock-repository';
import { SessionData } from '@server/modules/session/session.service';

jest.mock('uuid', () => ({ v4: () => 'mock-cart-item-id' }));

describe('CartService', () => {
  let service: CartService;
  let redis: Record<string, jest.Mock>;
  let sessionService: Record<string, jest.Mock>;
  let menuItemRepo: MockRepository<MenuItem>;

  const mockSession: SessionData = {
    sessionToken: 'token-1',
    storeId: 'store-1',
    tableId: 'table-1',
    tableNumber: 5,
    tableName: '5번 테이블',
    createdAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2024-01-01T02:00:00.000Z',
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(3600),
    };

    sessionService = {
      validateSession: jest.fn().mockResolvedValue(mockSession),
      getSessionKey: jest.fn().mockReturnValue('session:store-1:token-1'),
      renewSession: jest.fn().mockResolvedValue(undefined),
    };

    menuItemRepo = createMockRepository<MenuItem>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: SessionService, useValue: sessionService },
        { provide: getRepositoryToken(MenuItem), useValue: menuItemRepo },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart', () => {
    it('빈 장바구니를 반환해야 한다', async () => {
      redis.get.mockResolvedValue(null);

      const cart = await service.getCart('token-1');

      expect(cart.items).toEqual([]);
      expect(cart.totalAmount).toBe(0);
      expect(sessionService.validateSession).toHaveBeenCalledWith('token-1');
    });

    it('기존 장바구니 아이템을 반환해야 한다', async () => {
      const items = [
        {
          cartItemId: 'item-1',
          menuItemId: 'menu-1',
          menuItemName: '아메리카노',
          quantity: 2,
          unitPrice: 4500,
          totalPrice: 9000,
          selectedOptions: [],
        },
      ];
      redis.get.mockResolvedValue(JSON.stringify(items));

      const cart = await service.getCart('token-1');

      expect(cart.items).toHaveLength(1);
      expect(cart.totalAmount).toBe(9000);
    });
  });

  describe('addItem', () => {
    it('메뉴 아이템을 장바구니에 추가해야 한다', async () => {
      menuItemRepo.findOne!.mockResolvedValue({
        id: 'menu-1',
        name: '아메리카노',
        price: 4500,
        optionGroups: [],
      });
      // 첫 번째 get: addItem 내부에서 기존 아이템 조회
      // 두 번째 get: getCart에서 저장 후 조회
      redis.get
        .mockResolvedValueOnce(null) // 기존 장바구니 비어있음
        .mockResolvedValueOnce(null); // getCart 내부 (비어있음으로 시작, setex 후 재조회)

      // getCart가 내부적으로 다시 호출되므로, setex 후의 상태를 시뮬레이션
      // addItem은 마지막에 this.getCart를 호출하므로 validateSession이 두 번 호출됨
      const expectedItems = [
        {
          cartItemId: 'mock-cart-item-id',
          menuItemId: 'menu-1',
          menuItemName: '아메리카노',
          quantity: 1,
          unitPrice: 4500,
          totalPrice: 4500,
          selectedOptions: [],
        },
      ];
      // addItem -> setex -> getCart -> redis.get
      redis.get
        .mockReset()
        .mockResolvedValueOnce(null) // addItem 내 기존 카트
        .mockResolvedValueOnce(JSON.stringify(expectedItems)); // getCart에서 반환

      const result = await service.addItem('token-1', {
        menuItemId: 'menu-1',
        quantity: 1,
        selectedOptions: [],
      });

      expect(redis.setex).toHaveBeenCalled();
      expect(sessionService.renewSession).toHaveBeenCalledWith('token-1');
    });

    it('옵션 가격을 포함하여 계산해야 한다', async () => {
      menuItemRepo.findOne!.mockResolvedValue({
        id: 'menu-1',
        name: '라떼',
        price: 5000,
        optionGroups: [],
      });

      const options = [
        {
          optionGroupId: 'og-1',
          optionGroupName: '사이즈',
          optionId: 'opt-1',
          optionName: '라지',
          additionalPrice: 500,
        },
        {
          optionGroupId: 'og-2',
          optionGroupName: '샷',
          optionId: 'opt-2',
          optionName: '추가샷',
          additionalPrice: 500,
        },
      ];

      redis.get.mockResolvedValueOnce(null); // 기존 카트
      // getCart가 반환할 데이터 - setex에 전달된 데이터를 확인
      redis.get.mockResolvedValueOnce(
        JSON.stringify([
          {
            cartItemId: 'mock-cart-item-id',
            menuItemId: 'menu-1',
            menuItemName: '라떼',
            quantity: 2,
            unitPrice: 6000, // 5000 + 500 + 500
            totalPrice: 12000, // 6000 * 2
            selectedOptions: options,
          },
        ]),
      );

      await service.addItem('token-1', {
        menuItemId: 'menu-1',
        quantity: 2,
        selectedOptions: options,
      });

      // setex에 저장된 데이터 확인
      const savedData = JSON.parse(redis.setex.mock.calls[0][2]);
      expect(savedData[0].unitPrice).toBe(6000);
      expect(savedData[0].totalPrice).toBe(12000);
    });

    it('존재하지 않는 메뉴 아이템이면 NotFoundException을 던져야 한다', async () => {
      menuItemRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.addItem('token-1', {
          menuItemId: 'nonexistent',
          quantity: 1,
          selectedOptions: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateItem', () => {
    it('수량을 업데이트하고 가격을 재계산해야 한다', async () => {
      const existingItems = [
        {
          cartItemId: 'item-1',
          menuItemId: 'menu-1',
          menuItemName: '아메리카노',
          quantity: 1,
          unitPrice: 4500,
          totalPrice: 4500,
          selectedOptions: [],
        },
      ];
      redis.get
        .mockResolvedValueOnce(JSON.stringify(existingItems))
        .mockResolvedValueOnce(
          JSON.stringify([{ ...existingItems[0], quantity: 3, totalPrice: 13500 }]),
        );

      await service.updateItem('token-1', 'item-1', { quantity: 3 });

      const savedData = JSON.parse(redis.setex.mock.calls[0][2]);
      expect(savedData[0].quantity).toBe(3);
      expect(savedData[0].totalPrice).toBe(13500);
    });

    it('존재하지 않는 아이템이면 NotFoundException을 던져야 한다', async () => {
      redis.get.mockResolvedValue(JSON.stringify([]));

      await expect(
        service.updateItem('token-1', 'nonexistent', { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('아이템을 장바구니에서 제거해야 한다', async () => {
      const existingItems = [
        {
          cartItemId: 'item-1',
          menuItemId: 'menu-1',
          menuItemName: '아메리카노',
          quantity: 1,
          unitPrice: 4500,
          totalPrice: 4500,
          selectedOptions: [],
        },
        {
          cartItemId: 'item-2',
          menuItemId: 'menu-2',
          menuItemName: '라떼',
          quantity: 1,
          unitPrice: 5000,
          totalPrice: 5000,
          selectedOptions: [],
        },
      ];
      redis.get
        .mockResolvedValueOnce(JSON.stringify(existingItems))
        .mockResolvedValueOnce(
          JSON.stringify([existingItems[1]]),
        );

      await service.removeItem('token-1', 'item-1');

      const savedData = JSON.parse(redis.setex.mock.calls[0][2]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].cartItemId).toBe('item-2');
    });
  });

  describe('clearCart', () => {
    it('장바구니를 비워야 한다', async () => {
      await service.clearCart('token-1');

      expect(redis.del).toHaveBeenCalledWith('cart:store-1:token-1');
    });
  });

  describe('getCartItems', () => {
    it('장바구니 아이템 배열을 반환해야 한다', async () => {
      const items = [
        {
          cartItemId: 'item-1',
          menuItemId: 'menu-1',
          menuItemName: '아메리카노',
          quantity: 1,
          unitPrice: 4500,
          totalPrice: 4500,
          selectedOptions: [],
        },
      ];
      redis.get.mockResolvedValue(JSON.stringify(items));

      const result = await service.getCartItems('token-1');

      expect(result).toEqual(items);
    });
  });
});
