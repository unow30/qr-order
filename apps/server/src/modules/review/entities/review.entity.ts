import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('reviews')
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @Column()
  orderId: string;

  @Column()
  menuItemId: string;

  @Column()
  menuItemName: string;

  @Column()
  sessionToken: string;

  @Column({ type: 'int' })
  rating: number; // 1~5

  @Column({ nullable: true, type: 'text' })
  comment: string;

  @Column({ default: true })
  isVisible: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
