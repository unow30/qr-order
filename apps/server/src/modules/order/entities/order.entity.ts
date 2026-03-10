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

  @Column({ nullable: true, type: 'text' })
  note: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
