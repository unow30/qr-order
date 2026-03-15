import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { OrderService } from '../order/order.service';
import {
  CreatePaymentDto,
  ConfirmPaymentDto,
  WebhookPaymentDto,
  PaymentStatus,
  OrderStatus,
  UpdateOrderStatusDto,
} from '@qr-order/shared-types';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    private readonly orderService: OrderService,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<{ paymentId: string; amount: number; orderId: string }> {
    const order = await this.orderService.findOne(dto.orderId);

    if (order.totalAmount !== dto.amount) {
      throw new BadRequestException('결제 금액이 주문 금액과 일치하지 않습니다.');
    }

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      storeId: order.storeId,
      amount: dto.amount,
      method: dto.method,
      status: PaymentStatus.PENDING,
    });

    const saved = await this.paymentRepository.save(payment);
    return { paymentId: saved.id, amount: saved.amount, orderId: saved.orderId };
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({ where: { id: dto.paymentId } });
    if (!payment) throw new NotFoundException('결제 정보를 찾을 수 없습니다.');

    if (payment.amount !== dto.amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    // PG 검증 로직 (실제 구현시 PG API 호출)
    payment.pgPaymentId = dto.pgPaymentKey;
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();

    const saved = await this.paymentRepository.save(payment);

    // 주문 상태 업데이트
    await this.orderService.updateStatus(payment.orderId, { status: OrderStatus.CONFIRMED });

    return saved;
  }

  async handleWebhook(dto: WebhookPaymentDto): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { pgPaymentId: dto.pgPaymentId },
    });
    if (!payment) return;

    if (dto.status === 'SUCCESS') {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    } else if (dto.status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
      payment.failedReason = dto.failedReason ?? '';
    } else if (dto.status === 'CANCELLED') {
      payment.status = PaymentStatus.CANCELLED;
    }

    await this.paymentRepository.save(payment);
  }

  async findByOrder(orderId: string): Promise<PaymentEntity | null> {
    return this.paymentRepository.findOne({ where: { orderId } });
  }
}
