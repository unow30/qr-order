import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { MenuItem } from '@server/modules/menu/entities/menu-item.entity';
import { MenuOption } from '@server/modules/menu/entities/menu-option.entity';

@Entity('menu_option_groups')
export class MenuOptionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  menuItemId: string;

  @Column()
  name: string;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: 1 })
  maxSelect: number;

  @ManyToOne(() => MenuItem, (item) => item.optionGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuItemId' })
  menuItem: MenuItem;

  @OneToMany(() => MenuOption, (option) => option.group, { cascade: true })
  options: MenuOption[];
}
