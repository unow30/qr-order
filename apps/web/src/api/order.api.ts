import client from './client';
import { Order, CreateOrderDto } from '@qr-order/shared-types';

export const createOrder = (dto: CreateOrderDto): Promise<Order> => client.post('/orders', dto);
export const getOrder = (id: string): Promise<Order> => client.get(`/orders/${id}`);
