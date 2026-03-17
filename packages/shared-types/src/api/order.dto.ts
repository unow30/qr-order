import { Order, OrderStatus } from '../entities/order.types';

export interface CreateOrderDto {
  note?: string;
  couponCode?: string; // 쿠폰 코드 (선택)
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
  storeId: string;
  status: OrderStatus;
  updatedAt: string;
}
