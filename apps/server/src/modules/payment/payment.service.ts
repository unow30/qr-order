import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { Order } from '../order/entities/order.entity';
import { OrderService } from '../order/order.service';
import {
  CreatePaymentDto,
  ConfirmPaymentDto,
  WebhookPaymentDto,
  PaymentStatus,
  OrderStatus,
} from '@qr-order/shared-types';

/** 더 이상 상태 변경이 불가능한 최종 결제 상태 */
const FINAL_PAYMENT_STATUSES = [
  PaymentStatus.COMPLETED,
  PaymentStatus.CANCELLED,
  PaymentStatus.REFUNDED,
];

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    private readonly orderService: OrderService,
    private readonly dataSource: DataSource,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
  ): Promise<{ paymentId: string; amount: number; orderId: string }> {
    const order = await this.orderService.findOne(dto.orderId);

    if (order.finalAmount !== dto.amount) {
      throw new BadRequestException('결제 금액이 주문 금액과 일치하지 않습니다.');
    }

    // 멱등성: 이미 진행 중인 PENDING 결제가 있으면 기존 것 반환
    const existingPending = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId, status: PaymentStatus.PENDING },
    });
    if (existingPending) {
      return {
        paymentId: existingPending.id,
        amount: existingPending.amount,
        orderId: existingPending.orderId,
      };
    }

    // 이미 완료된 결제가 있으면 중복 결제 차단
    const existingCompleted = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId, status: PaymentStatus.COMPLETED },
    });
    if (existingCompleted) {
      throw new BadRequestException('이미 결제가 완료된 주문입니다.');
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

    // FSM 가드: 이미 완료된 결제면 멱등하게 성공 반환 (클라이언트 재시도 안전)
    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    // PENDING 상태에서만 confirm 허용
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `처리할 수 없는 결제 상태입니다. (현재: ${payment.status})`,
      );
    }

    if (payment.amount !== dto.amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    // 트랜잭션: 결제 완료 + 주문 상태 업데이트를 원자적으로 처리
    // → 둘 중 하나라도 실패하면 전체 롤백
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let saved: PaymentEntity;
    try {
      payment.pgPaymentId = dto.pgPaymentKey;
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      saved = await qr.manager.save(PaymentEntity, payment);

      // 주문 상태를 CONFIRMED로 직접 업데이트 (트랜잭션 내)
      await qr.manager.update(Order, payment.orderId, { status: OrderStatus.CONFIRMED });

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    // 커밋 성공 후 SSE 이벤트 발행 (베스트-에포트: 실패해도 결제는 유지됨)
    this.orderService.emitStatusChange(payment.orderId, OrderStatus.CONFIRMED, payment.storeId);

    return saved;
  }

  async handleWebhook(dto: WebhookPaymentDto): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { pgPaymentId: dto.pgPaymentId },
    });
    if (!payment) return;

    // 최종 상태면 무시 → PG 재전송 방지 (200 반환으로 PG 재시도 중단)
    if (FINAL_PAYMENT_STATUSES.includes(payment.status)) {
      return;
    }

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
