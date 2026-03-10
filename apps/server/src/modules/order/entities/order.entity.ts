import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderStatus } from '@qr-order/shared-types';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  storeId: string;

  @Column()
  sessionToken: string;

  @Column()
  tableId: string;

  @Column()
  tableNumber: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'int' })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  discountAmount: number;  // 쿠폰 할인 금액

  @Column({ type: 'int' })
  finalAmount: number;     // 실제 결제 금액 (totalAmount - discountAmount)

  @Column({ nullable: true, type: 'uuid' })
  couponId: string | null; // 사용된 쿠폰 ID

  @Column({ nullable: true, type: 'text' })
  note: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
