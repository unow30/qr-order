import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '@server/modules/order/entities/order.entity';
import { SelectedOption } from '@qr-order/shared-types';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  menuItemId: string;

  @Column()
  menuItemName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  totalPrice: number;

  @Column({ type: 'jsonb', default: [] })
  selectedOptions: SelectedOption[];

  @Column({ type: 'timestamp', nullable: true, default: null })
  cancelledAt: Date | null;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
