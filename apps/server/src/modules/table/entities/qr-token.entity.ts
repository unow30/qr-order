import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TableEntity } from '@server/modules/table/entities/table.entity';

@Entity('qr_tokens')
export class QrToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tableId: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ManyToOne(() => TableEntity, (table) => table.qrTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tableId' })
  table: TableEntity;

  @CreateDateColumn()
  createdAt: Date;
}
