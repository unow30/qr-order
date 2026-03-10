import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MenuOptionGroup } from './menu-option-group.entity';

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
}
