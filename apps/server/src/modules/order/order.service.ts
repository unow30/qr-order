import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from '@server/modules/order/entities/order.entity';
import { OrderItem } from '@server/modules/order/entities/order-item.entity';
import { CartService } from '@server/modules/cart/cart.service';
import { SessionService } from '@server/modules/session/session.service';
import { OrderSseService } from '@server/modules/order/order-sse.service';
import { CouponService } from '@server/modules/coupon/coupon.service';
import { MenuService } from '@server/modules/menu/menu.service';
import { OrderStatus, CreateOrderDto, UpdateOrderStatusDto } from '@qr-order/shared-types';

/** 더 이상 상태 변경이 불가능한 최종 주문 상태 */
const FINAL_ORDER_STATUSES = [OrderStatus.SERVED, OrderStatus.CANCELLED];

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly cartService: CartService,
    private readonly sessionService: SessionService,
    private readonly orderSseService: OrderSseService,
    private readonly couponService: CouponService,
    private readonly menuService: MenuService,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(sessionToken: string, dto: CreateOrderDto): Promise<Order> {
    const session = await this.sessionService.validateSession(sessionToken);
    const cartItems = await this.cartService.getCartItems(sessionToken);

    if (!cartItems.length) {
      throw new BadRequestException('장바구니가 비어 있습니다.');
    }

    // 기존 PENDING 주문이 있으면 항목 추가, 없으면 새 주문 생성
    const existingOrder = await this.findPendingOrder(sessionToken);

    let savedOrderId: string;

    if (existingOrder) {
      savedOrderId = await this.appendItemsToOrder(
        existingOrder,
        cartItems,
        session.storeId,
        dto,
      );
    } else {
      savedOrderId = await this.createNewOrder(
        session,
        sessionToken,
        cartItems,
        dto,
      );
    }

    // 커밋 후 Redis best-effort 처리
    await this.cartService.clearCart(sessionToken).catch(() => {});
    await this.menuService.invalidateCache(session.storeId).catch(() => {});

    return this.findOne(savedOrderId);
  }

  private async findPendingOrder(sessionToken: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { sessionToken, status: OrderStatus.PENDING },
      relations: ['items'],
    });
  }

  private async createNewOrder(
    session: { storeId: string; tableId: string; tableNumber: number },
    sessionToken: string,
    cartItems: { menuItemId: string; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; selectedOptions: any[] }[],
    dto: CreateOrderDto,
  ): Promise<string> {
    const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    let discountAmount = 0;
    let couponId: string | null = null;
    if (dto.couponCode) {
      const validation = await this.couponService.validate(
        session.storeId,
        dto.couponCode,
        totalAmount,
      );
      if (!validation.valid) {
        throw new BadRequestException(validation.message ?? '유효하지 않은 쿠폰입니다.');
      }
      discountAmount = validation.discountAmount ?? 0;
      couponId = validation.couponId ?? null;
    }

    const finalAmount = totalAmount - discountAmount;

    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        storeId: session.storeId,
        sessionToken,
        tableId: session.tableId,
        tableNumber: session.tableNumber,
        status: OrderStatus.PENDING,
        totalAmount,
        discountAmount,
        finalAmount,
        couponId,
        note: dto.note,
      });
      const savedOrder = await manager.save(Order, order);

      const orderItems = cartItems.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedOptions: item.selectedOptions,
        }),
      );
      await manager.save(OrderItem, orderItems);

      if (couponId) {
        await this.couponService.markUsed(couponId, manager);
      }

      await this.menuService.decrementStock(
        cartItems.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
        session.storeId,
        manager,
      );

      return savedOrder.id;
    });
  }

  private async appendItemsToOrder(
    existingOrder: Order,
    cartItems: { menuItemId: string; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; selectedOptions: any[] }[],
    storeId: string,
    dto: CreateOrderDto,
  ): Promise<string> {
    const newItemsTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // 쿠폰 정책: 기존 주문에 쿠폰이 있으면 새 쿠폰 거부
    let discountAmount = existingOrder.discountAmount;
    let couponId = existingOrder.couponId;
    if (dto.couponCode) {
      if (existingOrder.couponId) {
        throw new BadRequestException('이미 쿠폰이 적용된 주문입니다. 추가 주문에는 쿠폰을 적용할 수 없습니다.');
      }
      const activeTotal = existingOrder.items
        .filter((i) => !i.cancelledAt)
        .reduce((sum, i) => sum + i.totalPrice, 0);
      const combinedTotal = activeTotal + newItemsTotal;
      const validation = await this.couponService.validate(storeId, dto.couponCode, combinedTotal);
      if (!validation.valid) {
        throw new BadRequestException(validation.message ?? '유효하지 않은 쿠폰입니다.');
      }
      discountAmount = validation.discountAmount ?? 0;
      couponId = validation.couponId ?? null;
    }

    await this.dataSource.transaction(async (manager) => {
      // 새 항목 생성
      const orderItems = cartItems.map((item) =>
        manager.create(OrderItem, {
          orderId: existingOrder.id,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedOptions: item.selectedOptions,
        }),
      );
      await manager.save(OrderItem, orderItems);

      // 금액 재계산: 기존 활성 항목 + 새 항목
      const activeTotal = existingOrder.items
        .filter((i) => !i.cancelledAt)
        .reduce((sum, i) => sum + i.totalPrice, 0);
      existingOrder.totalAmount = activeTotal + newItemsTotal;
      existingOrder.discountAmount = discountAmount;
      existingOrder.couponId = couponId;
      existingOrder.finalAmount = existingOrder.totalAmount - discountAmount;

      // note append
      if (dto.note) {
        existingOrder.note = [existingOrder.note, dto.note]
          .filter(Boolean)
          .join('\n');
      }

      // 쿠폰 사용 처리
      if (dto.couponCode && couponId) {
        await this.couponService.markUsed(couponId, manager);
      }

      await manager.update(Order, existingOrder.id, {
        totalAmount: existingOrder.totalAmount,
        discountAmount: existingOrder.discountAmount,
        couponId: existingOrder.couponId,
        finalAmount: existingOrder.finalAmount,
        note: existingOrder.note,
      });

      // 재고 차감 (새 항목만)
      await this.menuService.decrementStock(
        cartItems.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
        storeId,
        manager,
      );
    });

    return existingOrder.id;
  }

  async cancelOrderItem(
    orderId: string,
    itemId: string,
    sessionToken: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.sessionToken !== sessionToken) {
      throw new BadRequestException('본인의 주문만 취소할 수 있습니다.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `대기중(PENDING) 상태에서만 취소할 수 있습니다. (현재: ${order.status})`,
      );
    }

    const targetItem = order.items.find(
      (i) => i.id === itemId && !i.cancelledAt,
    );
    if (!targetItem) {
      throw new NotFoundException('취소할 주문 항목을 찾을 수 없습니다.');
    }

    const originalTotal = order.totalAmount;

    await this.dataSource.transaction(async (manager) => {
      targetItem.cancelledAt = new Date();
      await manager.save(OrderItem, targetItem);

      const activeItems = order.items.filter(
        (i) => !i.cancelledAt && i.id !== itemId,
      );

      if (activeItems.length === 0) {
        order.status = OrderStatus.CANCELLED;
        order.totalAmount = 0;
        order.discountAmount = 0;
        order.finalAmount = 0;
        if (order.couponId) {
          await this.couponService.markUnused(order.couponId, manager);
          order.couponId = null;
        }
      } else {
        const newTotal = activeItems.reduce((sum, i) => sum + i.totalPrice, 0);
        order.totalAmount = newTotal;
        if (order.discountAmount > 0 && originalTotal > 0) {
          order.discountAmount = Math.floor(
            order.discountAmount * (newTotal / originalTotal),
          );
        }
        order.finalAmount = newTotal - order.discountAmount;
      }
      await manager.save(Order, order);

      await this.menuService.incrementStock(
        [{ menuItemId: targetItem.menuItemId, quantity: targetItem.quantity }],
        order.storeId,
        manager,
      );
    });

    await this.menuService.invalidateCache(order.storeId).catch(() => {});

    if ((order.status as OrderStatus) === OrderStatus.CANCELLED) {
      this.orderSseService.emit(orderId, {
        orderId,
        storeId: order.storeId,
        status: OrderStatus.CANCELLED,
        updatedAt: new Date().toISOString(),
      });
    }

    return this.findOne(orderId);
  }

  async findBySession(sessionToken: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { sessionToken, status: OrderStatus.PENDING },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    return order;
  }

  async findAll(storeId: string | null): Promise<Order[]> {
    return this.orderRepository.find({
      where: storeId ? { storeId } : {},
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTable(storeId: string, tableId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { storeId, tableId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);

    // FSM 가드: 최종 상태(완료/취소)에서는 추가 변경 불가
    if (FINAL_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `이미 처리 완료된 주문입니다. (현재: ${order.status})`,
      );
    }

    order.status = dto.status;
    const updated = await this.orderRepository.save(order);

    this.orderSseService.emit(id, {
      orderId: id,
      storeId: updated.storeId,
      status: dto.status,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * DB 쓰기 없이 SSE 이벤트만 발행한다.
   * confirmPayment 트랜잭션 커밋 후 어드민 UI에 실시간 알림을 보낼 때 사용.
   */
  emitStatusChange(orderId: string, status: OrderStatus, storeId: string): void {
    this.orderSseService.emit(orderId, {
      orderId,
      storeId,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  getOrderStream(orderId: string) {
    return this.orderSseService.getStream(orderId);
  }

  getStoreStream(storeId: string | null) {
    return this.orderSseService.getStoreStream(storeId);
  }
}
