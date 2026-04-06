import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MenuOptionGroup } from '@server/modules/menu/entities/menu-option-group.entity';

@Entity('menu_options')
export class MenuOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 0 })
  additionalPrice: number;

  @Column({ default: true })
  isAvailable: boolean;

  @ManyToOne(() => MenuOptionGroup, (group) => group.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: MenuOptionGroup;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
