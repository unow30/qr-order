import client from '@admin/api/client';
import { AdminProcessPaymentDto, PaymentMethod } from '@qr-order/shared-types';

export const processAdminPayment = (
  orderId: string,
  method: PaymentMethod,
): Promise<void> =>
  client.post('/payments/admin/process', { orderId, method } satisfies AdminProcessPaymentDto);
