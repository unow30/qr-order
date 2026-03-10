import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { MenuCategory } from './menu-category.entity';
import { MenuOptionGroup } from './menu-option-group.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  categoryId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => MenuCategory, (category) => category.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: MenuCategory;

  @OneToMany(() => MenuOptionGroup, (group) => group.menuItem, { cascade: true })
  optionGroups: MenuOptionGroup[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
