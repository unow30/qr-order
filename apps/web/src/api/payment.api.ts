import client from './client';
import { CreatePaymentDto, ConfirmPaymentDto, PaymentResponse } from '@qr-order/shared-types';

export const createPayment = (dto: CreatePaymentDto): Promise<PaymentResponse> =>
  client.post('/payments', dto);
export const confirmPayment = (dto: ConfirmPaymentDto): Promise<void> =>
  client.post('/payments/confirm', dto);
