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

  private getMenuCacheKey(storeId: string): string {
    return `menu:${storeId}:all`;
  }

  async getMenu(storeId: string): Promise<MenuCategory[]> {
    const cacheKey = this.getMenuCacheKey(storeId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.categoryRepository.find({
      where: { storeId, isActive: true },
      relations: ['items', 'items.optionGroups', 'items.optionGroups.options'],
      order: { sortOrder: 'ASC' },
    });

    await this.redis.setex(cacheKey, MENU_CACHE_TTL, JSON.stringify(categories));
    return categories;
  }

  async invalidateCache(storeId: string): Promise<void> {
    await this.redis.del(this.getMenuCacheKey(storeId));
  }

  async createCategory(storeId: string, dto: CreateMenuCategoryDto): Promise<MenuCategory> {
    const category = this.categoryRepository.create({ ...dto, storeId });
    const saved = await this.categoryRepository.save(category);
    await this.invalidateCache(storeId);
    return saved;
  }

  async updateCategory(storeId: string, id: string, dto: UpdateMenuCategoryDto): Promise<MenuCategory> {
    const category = await this.categoryRepository.findOne({ where: { id, storeId } });
    if (!category) throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    Object.assign(category, dto);
    const saved = await this.categoryRepository.save(category);
    await this.invalidateCache(storeId);
    return saved;
  }

  async deleteCategory(storeId: string, id: string): Promise<void> {
    await this.categoryRepository.delete({ id, storeId });
    await this.invalidateCache(storeId);
  }

  async createItem(storeId: string, dto: CreateMenuItemDto): Promise<MenuItem> {
    const item = this.itemRepository.create(dto);
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache(storeId);
    return saved;
  }

  async updateItem(storeId: string, id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!item) throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
    Object.assign(item, dto);
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache(storeId);
    return saved;
  }

  async deleteItem(storeId: string, id: string): Promise<void> {
    await this.itemRepository.delete(id);
    await this.invalidateCache(storeId);
  }

  async createOptionGroup(storeId: string, dto: CreateMenuOptionGroupDto): Promise<MenuOptionGroup> {
    const { options, ...groupData } = dto;
    const group = this.optionGroupRepository.create({
      ...groupData,
      options: options.map((opt) => this.optionRepository.create(opt)),
    });
    const saved = await this.optionGroupRepository.save(group);
    await this.invalidateCache(storeId);
    return saved;
  }
}
