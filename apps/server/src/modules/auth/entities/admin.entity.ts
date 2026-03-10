import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminRole } from '@qr-order/shared-types';

@Entity('admins')
export class AdminEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: 'STORE_ADMIN' })
  role: AdminRole;

  @Column({ nullable: true })
  storeId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
