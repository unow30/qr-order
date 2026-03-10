import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../config/redis.config';
import Redis from 'ioredis';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuOptionGroup } from './entities/menu-option-group.entity';
import { MenuOption } from './entities/menu-option.entity';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuOptionGroupDto,
} from '@qr-order/shared-types';

const MENU_CACHE_KEY = 'menu:all';
const MENU_CACHE_TTL = 300; // 5분

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategory)
    private readonly categoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepository: Repository<MenuItem>,
    @InjectRepository(MenuOptionGroup)
    private readonly optionGroupRepository: Repository<MenuOptionGroup>,
    @InjectRepository(MenuOption)
    private readonly optionRepository: Repository<MenuOption>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async getMenu(): Promise<MenuCategory[]> {
    const cached = await this.redis.get(MENU_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      relations: ['items', 'items.optionGroups', 'items.optionGroups.options'],
      order: { sortOrder: 'ASC' },
    });

    await this.redis.setex(MENU_CACHE_KEY, MENU_CACHE_TTL, JSON.stringify(categories));
    return categories;
  }

  async invalidateCache(): Promise<void> {
    await this.redis.del(MENU_CACHE_KEY);
  }

  async createCategory(dto: CreateMenuCategoryDto): Promise<MenuCategory> {
    const category = this.categoryRepository.create(dto);
    const saved = await this.categoryRepository.save(category);
    await this.invalidateCache();
    return saved;
  }

  async updateCategory(id: string, dto: UpdateMenuCategoryDto): Promise<MenuCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    Object.assign(category, dto);
    const saved = await this.categoryRepository.save(category);
    await this.invalidateCache();
    return saved;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryRepository.delete(id);
    await this.invalidateCache();
  }

  async createItem(dto: CreateMenuItemDto): Promise<MenuItem> {
    const item = this.itemRepository.create(dto);
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache();
    return saved;
  }

  async updateItem(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
    Object.assign(item, dto);
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache();
    return saved;
  }

  async deleteItem(id: string): Promise<void> {
    await this.itemRepository.delete(id);
    await this.invalidateCache();
  }

  async createOptionGroup(dto: CreateMenuOptionGroupDto): Promise<MenuOptionGroup> {
    const { options, ...groupData } = dto;
    const group = this.optionGroupRepository.create({
      ...groupData,
      options: options.map((opt) => this.optionRepository.create(opt)),
    });
    const saved = await this.optionGroupRepository.save(group);
    await this.invalidateCache();
    return saved;
  }
}
