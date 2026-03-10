import { Order, OrderStatus } from '../entities/order.types';

export interface CreateOrderDto {
  note?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}

export interface OrderSseEvent {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
}
