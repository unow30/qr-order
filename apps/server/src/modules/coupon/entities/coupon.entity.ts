import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscountType } from '@qr-order/shared-types';

@Entity('coupons')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @Column({ unique: false, length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 10 })
  discountType: DiscountType;

  @Column({ type: 'int' })
  discountValue: number;

  @Column({ type: 'int', default: 0 })
  minOrderAmount: number;

  @Column({ type: 'int', default: 0 }) // 0 = 무제한
  maxUses: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
