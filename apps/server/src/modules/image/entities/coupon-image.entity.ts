import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponEntity } from '../../coupon/entities/coupon.entity';

@Entity('coupon_images')
export class CouponImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @Column()
  couponId: string;

  @ManyToOne(() => CouponEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'couponId' })
  coupon: CouponEntity;

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  altText: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'timestamptz', nullable: true })
  startAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
