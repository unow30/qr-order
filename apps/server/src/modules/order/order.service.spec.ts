import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderService } from '@server/modules/order/order.service';
import { Order } from '@server/modules/order/entities/order.entity';
import { OrderItem } from '@server/modules/order/entities/order-item.entity';
import { CartService } from '@server/modules/cart/cart.service';
import { SessionService } from '@server/modules/session/session.service';
import { OrderSseService } from '@server/modules/order/order-sse.service';
import { CouponService } from '@server/modules/coupon/coupon.service';
import { MenuService } from '@server/modules/menu/menu.service';
import { createMockRepository, MockRepository } from '../../../test/helpers/mock-repository';
import { OrderStatus } from '@qr-order/shared-types';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: MockRepository<Order>;
  let orderItemRepo: MockRepository<OrderItem>;
  let cartService: Record<string, jest.Mock>;
  let sessionService: Record<string, jest.Mock>;
  let orderSseService: Record<string, jest.Mock>;
  let couponService: Record<string, jest.Mock>;
  let menuService: Record<string, jest.Mock>;

  const mockSession = {
    sessionToken: 'token-1',
    storeId: 'store-1',
    tableId: 'table-1',
    tableNumber: 5,
    tableName: '5번 테이블',
    createdAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2024-01-01T02:00:00.000Z',
  };

  const mockCartItems = [
    {
      cartItemId: 'cart-1',
      menuItemId: 'menu-1',
      menuItemName: '아메리카노',
      quantity: 2,
      unitPrice: 4500,
      totalPrice: 9000,
      selectedOptions: [],
    },
    {
      cartItemId: 'cart-2',
      menuItemId: 'menu-2',
      menuItemName: '라떼',
      quantity: 1,
      unitPrice: 5000,
      totalPrice: 5000,
      selectedOptions: [
        {
          optionGroupId: 'og-1',
          optionGroupName: '샷',
          optionId: 'opt-1',
          optionName: '추가샷',
          additionalPrice: 500,
        },
      ],
    },
  ];

  beforeEach(async () => {
    orderRepo = createMockRepository<Order>();
    orderItemRepo = createMockRepository<OrderItem>();

    cartService = {
      getCartItems: jest.fn().mockResolvedValue(mockCartItems),
      clearCart: jest.fn().mockResolvedValue(undefined),
    };
    sessionService = {
      validateSession: jest.fn().mockResolvedValue(mockSession),
    };
    orderSseService = {
      emit: jest.fn(),
      getStream: jest.fn(),
    };
    couponService = {
      validate: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };
    menuService = {
      decrementStock: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: CartService, useValue: cartService },
        { provide: SessionService, useValue: sessionService },
        { provide: OrderSseService, useValue: orderSseService },
        { provide: CouponService, useValue: couponService },
        { provide: MenuService, useValue: menuService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('createOrder', () => {
    beforeEach(() => {
      orderRepo.save!.mockResolvedValue({ id: 'order-1' });
      orderRepo.findOne!.mockResolvedValue({
        id: 'order-1',
        storeId: 'store-1',
        status: OrderStatus.PENDING,
        totalAmount: 14000,
        discountAmount: 0,
        finalAmount: 14000,
        items: [],
      });
      orderItemRepo.save!.mockResolvedValue([]);
    });

    it('장바구니 아이템으로 주문을 생성해야 한다', async () => {
      const result = await service.createOrder('token-1', {});

      expect(sessionService.validateSession).toHaveBeenCalledWith('token-1');
      expect(cartService.getCartItems).toHaveBeenCalledWith('token-1');
      expect(orderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store-1',
          sessionToken: 'token-1',
          tableId: 'table-1',
          status: OrderStatus.PENDING,
          totalAmount: 14000,
          discountAmount: 0,
          finalAmount: 14000,
        }),
      );
      expect(orderItemRepo.save).toHaveBeenCalled();
      expect(cartService.clearCart).toHaveBeenCalledWith('token-1');
      expect(menuService.decrementStock).toHaveBeenCalledWith(
        [
          { menuItemId: 'menu-1', quantity: 2 },
          { menuItemId: 'menu-2', quantity: 1 },
        ],
        'store-1',
      );
    });

    it('장바구니가 비어있으면 BadRequestException을 던져야 한다', async () => {
      cartService.getCartItems.mockResolvedValue([]);

      await expect(service.createOrder('token-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('쿠폰 코드가 있으면 할인을 적용해야 한다', async () => {
      couponService.validate.mockResolvedValue({
        valid: true,
        couponId: 'coupon-1',
        discountAmount: 2000,
      });

      await service.createOrder('token-1', { couponCode: 'SAVE2000' });

      expect(couponService.validate).toHaveBeenCalledWith(
        'store-1',
        'SAVE2000',
        14000,
      );
      expect(orderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discountAmount: 2000,
          finalAmount: 12000,
          couponId: 'coupon-1',
        }),
      );
      expect(couponService.markUsed).toHaveBeenCalledWith('coupon-1');
    });

    it('유효하지 않은 쿠폰이면 BadRequestException을 던져야 한다', async () => {
      couponService.validate.mockResolvedValue({
        valid: false,
        message: '만료된 쿠폰입니다.',
      });

      await expect(
        service.createOrder('token-1', { couponCode: 'EXPIRED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('주문을 찾아 반환해야 한다', async () => {
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING,
        items: [],
      };
      orderRepo.findOne!.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-1');

      expect(result).toEqual(mockOrder);
      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        relations: ['items'],
      });
    });

    it('주문이 없으면 NotFoundException을 던져야 한다', async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('storeId로 필터링하여 주문 목록을 반환해야 한다', async () => {
      orderRepo.find!.mockResolvedValue([]);

      await service.findAll('store-1');

      expect(orderRepo.find).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        relations: ['items'],
        order: { createdAt: 'DESC' },
      });
    });

    it('storeId가 null이면 전체 조회해야 한다', async () => {
      orderRepo.find!.mockResolvedValue([]);

      await service.findAll(null);

      expect(orderRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: ['items'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateStatus', () => {
    it('주문 상태를 업데이트하고 SSE 이벤트를 발행해야 한다', async () => {
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING,
        items: [],
      };
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      orderRepo.save!.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      await service.updateStatus('order-1', {
        status: OrderStatus.CONFIRMED,
      });

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
      expect(orderSseService.emit).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderStatus.CONFIRMED,
        }),
      );
    });
  });
});
