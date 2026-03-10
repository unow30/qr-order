export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  MOBILE = 'MOBILE',
}

export interface Payment {
  id: string;
  orderId: string;
  pgPaymentId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: Date;
  failedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
