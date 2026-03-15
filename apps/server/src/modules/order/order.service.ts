import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { SessionService } from '../session/session.service';
import { OrderSseService } from './order-sse.service';
import { CouponService } from '../coupon/coupon.service';
import { MenuService } from '../menu/menu.service';
import { OrderStatus, CreateOrderDto, UpdateOrderStatusDto } from '@qr-order/shared-types';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly cartService: CartService,
    private readonly sessionService: SessionService,
    private readonly orderSseService: OrderSseService,
    private readonly couponService: CouponService,
    private readonly menuService: MenuService,
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

    const order = this.orderRepository.create({
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

    const savedOrder = await this.orderRepository.save(order);

    const orderItems = cartItems.map((item) =>
      this.orderItemRepository.create({
        orderId: savedOrder.id,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        selectedOptions: item.selectedOptions,
      }),
    );

    await this.orderItemRepository.save(orderItems);
    await this.cartService.clearCart(sessionToken);

    // 쿠폰 사용 횟수 증가
    if (couponId) {
      await this.couponService.markUsed(couponId);
    }

    // F10: 재고 차감
    await this.menuService.decrementStock(
      cartItems.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
      session.storeId,
    );

    return this.findOne(savedOrder.id);
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
    order.status = dto.status;
    const updated = await this.orderRepository.save(order);

    this.orderSseService.emit(id, {
      orderId: id,
      status: dto.status,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  }

  getOrderStream(orderId: string) {
    return this.orderSseService.getStream(orderId);
  }
}
