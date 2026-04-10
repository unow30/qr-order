import { PaymentMethod } from '../entities/payment.types';

export interface AdminProcessPaymentDto {
  orderId: string;
  method: PaymentMethod;
}

export interface CreatePaymentDto {
  orderId: string;
  method: PaymentMethod;
  amount: number;
}

export interface PaymentResponse {
  paymentId: string;
  pgPaymentKey?: string;
  amount: number;
  orderId: string;
}

export interface ConfirmPaymentDto {
  paymentId: string;
  pgPaymentKey: string;
  amount: number;
}

export interface WebhookPaymentDto {
  pgPaymentId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  amount: number;
  paidAt?: string;
  failedReason?: string;
}
