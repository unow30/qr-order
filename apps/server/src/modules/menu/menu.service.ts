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
  DeployMenuDto,
  DeployMenuResult,
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

  /**
   * F6: 메뉴 템플릿 배포
   * sourceStoreId의 메뉴를 targetStoreIds 각각에 복사
   */
  async deployMenu(dto: DeployMenuDto): Promise<DeployMenuResult[]> {
    const { sourceStoreId, targetStoreIds, clearTarget = false } = dto;

    // 소스 메뉴 전체 조회 (옵션까지 포함)
    const sourceCategories = await this.categoryRepository.find({
      where: { storeId: sourceStoreId },
      relations: ['items', 'items.optionGroups', 'items.optionGroups.options'],
      order: { sortOrder: 'ASC' },
    });

    const results: DeployMenuResult[] = [];

    for (const targetStoreId of targetStoreIds) {
      try {
        // clearTarget이면 대상 매장 메뉴 삭제
        if (clearTarget) {
          await this.categoryRepository.delete({ storeId: targetStoreId });
          await this.invalidateCache(targetStoreId);
        }

        let categoriesCreated = 0;
        let itemsCreated = 0;

        for (const srcCategory of sourceCategories) {
          // 카테고리 복사
          const newCategory = this.categoryRepository.create({
            storeId: targetStoreId,
            name: srcCategory.name,
            description: srcCategory.description,
            imageUrl: srcCategory.imageUrl,
            sortOrder: srcCategory.sortOrder,
            isActive: srcCategory.isActive,
          });
          const savedCategory = await this.categoryRepository.save(newCategory);
          categoriesCreated++;

          // 아이템 복사
          for (const srcItem of srcCategory.items ?? []) {
            const newItem = this.itemRepository.create({
              categoryId: savedCategory.id,
              name: srcItem.name,
              description: srcItem.description,
              price: srcItem.price,
              imageUrl: srcItem.imageUrl,
              isAvailable: srcItem.isAvailable,
              sortOrder: srcItem.sortOrder,
            });
            const savedItem = await this.itemRepository.save(newItem);
            itemsCreated++;

            // 옵션 그룹 + 옵션 복사
            for (const srcGroup of srcItem.optionGroups ?? []) {
              const newGroup = this.optionGroupRepository.create({
                menuItemId: savedItem.id,
                name: srcGroup.name,
                isRequired: srcGroup.isRequired,
                maxSelect: srcGroup.maxSelect,
                options: srcGroup.options.map((opt) =>
                  this.optionRepository.create({
                    name: opt.name,
                    additionalPrice: opt.additionalPrice,
                    isAvailable: opt.isAvailable,
                  }),
                ),
              });
              await this.optionGroupRepository.save(newGroup);
            }
          }
        }

        await this.invalidateCache(targetStoreId);
        results.push({ targetStoreId, success: true, categoriesCreated, itemsCreated });
      } catch (err) {
        results.push({
          targetStoreId,
          success: false,
          categoriesCreated: 0,
          itemsCreated: 0,
          error: err instanceof Error ? err.message : '알 수 없는 오류',
        });
      }
    }

    return results;
  }
}
