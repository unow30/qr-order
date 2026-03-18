import client from '@web/api/client';
import { Order, CreateOrderDto } from '@qr-order/shared-types';

export const createOrder = (dto: CreateOrderDto): Promise<Order> => client.post('/orders', dto);
export const getOrder = (id: string): Promise<Order> => client.get(`/orders/${id}`);
export const getMyOrders = (): Promise<Order[]> => client.get('/orders/my');
export const cancelOrderItem = (orderId: string, itemId: string): Promise<Order> =>
  client.delete(`/orders/${orderId}/items/${itemId}`);
