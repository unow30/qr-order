import client from './client';
import { Order, UpdateOrderStatusDto } from '@qr-order/shared-types';

export const getOrders = (): Promise<Order[]> => client.get('/orders');
export const updateOrderStatus = (id: string, dto: UpdateOrderStatusDto): Promise<Order> =>
  client.patch(`/orders/${id}/status`, dto);
