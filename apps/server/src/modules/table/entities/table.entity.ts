import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

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

  @Column({ type: 'uuid', unique: true })
  qrToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateQrToken() {
    if (!this.qrToken) {
      this.qrToken = uuidv4();
    }
  }
}
