import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { AdminRole } from '@qr-order/shared-types';
import { StoreEntity } from '../../store/entities/store.entity';

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

  @ManyToMany(() => StoreEntity, { eager: false, cascade: false })
  @JoinTable({
    name: 'admin_stores',
    joinColumn: { name: 'admin_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'store_id', referencedColumnName: 'id' },
  })
  stores: StoreEntity[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
