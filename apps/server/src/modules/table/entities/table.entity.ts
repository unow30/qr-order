import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QrToken } from '@server/modules/table/entities/qr-token.entity';

@Entity('tables')
export class TableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'default-store' })
  storeId: string;

  @Column()
  tableNumber: number;

  @Column()
  name: string;

  @Column({ default: 4 })
  capacity: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => QrToken, (token) => token.table, { cascade: true })
  qrTokens: QrToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
