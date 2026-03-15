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

  @Column({ default: '' })
  storeId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ nullable: true, comment: 'DEPRECATED: use menu_item_images table' })
  imageUrl: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: false })
  stockEnabled: boolean;  // true면 재고 관리 활성화

  @Column({ type: 'int', default: 0 })
  stock: number;          // 현재 재고 수량 (stockEnabled=true일 때만 유효)

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
