import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { SessionService } from '../session/session.service';
import { OrderSseService } from './order-sse.service';
import { CouponService } from '../coupon/coupon.service';
import { MenuService } from '../menu/menu.service';
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

    const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // 쿠폰 처리
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

    const savedOrderId = await this.dataSource.transaction(async (manager) => {
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

      // 쿠폰 사용 횟수 증가
      if (couponId) {
        await this.couponService.markUsed(couponId, manager);
      }

      // F10: 재고 차감
      await this.menuService.decrementStock(
        cartItems.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
        session.storeId,
        manager,
      );

      return savedOrder.id;
    });

    // 커밋 후 Redis best-effort 처리
    await this.cartService.clearCart(sessionToken).catch(() => {});
    await this.menuService.invalidateCache(session.storeId).catch(() => {});

    return this.findOne(savedOrderId);
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
