import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ReviewEntity } from '../../review/entities/review.entity';

@Entity('review_images')
export class ReviewImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @Column()
  reviewId: string;

  @ManyToOne(() => ReviewEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: ReviewEntity;

  @Column()
  imageUrl: string;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
