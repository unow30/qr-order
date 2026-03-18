import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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
  ReorderMenuCategoriesDto,
  ReorderMenuItemsDto,
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
    private readonly dataSource: DataSource,
  ) {}

  private getMenuCacheKey(storeId: string): string {
    return `menu:${storeId}:all`;
  }

  async getMenu(storeId: string | null): Promise<MenuCategory[]> {
    // storeId가 null이면 (SUPER_ADMIN 전체 보기) 캐시 없이 전체 조회
    if (!storeId) {
      return this.categoryRepository.find({
        where: { isActive: true },
        relations: ['items', 'items.optionGroups', 'items.optionGroups.options'],
        order: { sortOrder: 'ASC', items: { sortOrder: 'ASC' } },
      });
    }

    const cacheKey = this.getMenuCacheKey(storeId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.categoryRepository.find({
      where: { storeId, isActive: true },
      relations: ['items', 'items.optionGroups', 'items.optionGroups.options'],
      order: { sortOrder: 'ASC', items: { sortOrder: 'ASC' } },
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
    const item = this.itemRepository.create({ ...dto, storeId });
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache(storeId);
    return saved;
  }

  async updateItem(storeId: string, id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.itemRepository.findOne({
      where: { id, storeId },
      relations: ['category'],
    });
    if (!item) throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
    Object.assign(item, dto);
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache(storeId);
    return saved;
  }

  async deleteItem(storeId: string, id: string): Promise<void> {
    await this.itemRepository.delete({ id, storeId });
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
   * F10: 재고 수량 차감 (주문 생성 시 호출)
   * 재고 관리가 활성화된 아이템만 처리
   * manager를 전달하면 해당 트랜잭션 컨텍스트 안에서 실행 (캐시 무효화는 커밋 후 호출자 책임)
   */
  async decrementStock(
    items: { menuItemId: string; quantity: number }[],
    storeId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const itemRepo = manager ? manager.getRepository(MenuItem) : this.itemRepository;

    for (const { menuItemId, quantity } of items) {
      const item = await itemRepo.findOne({ where: { id: menuItemId } });
      if (!item || !item.stockEnabled) continue;

      const newStock = Math.max(0, item.stock - quantity);
      item.stock = newStock;
      if (newStock === 0) {
        item.isAvailable = false; // 재고 소진 시 자동 품절
      }
      await itemRepo.save(item);
    }

    // manager가 있으면(createOrder 컨텍스트) 호출자가 커밋 후 캐시 무효화 처리
    if (!manager) {
      await this.invalidateCache(storeId);
    }
  }

  /**
   * F10: 재고 수동 업데이트 (어드민)
   */
  async updateStock(
    storeId: string,
    itemId: string,
    stock: number,
    stockEnabled: boolean,
  ): Promise<MenuItem> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
    item.stockEnabled = stockEnabled;
    item.stock = stock;
    if (stockEnabled && stock > 0) {
      item.isAvailable = true; // 재고 보충 시 자동 판매 재개
    }
    const saved = await this.itemRepository.save(item);
    await this.invalidateCache(storeId);
    return saved;
  }

  async reorderCategories(storeId: string, dto: ReorderMenuCategoriesDto): Promise<void> {
    const ids = dto.orders.map((o) => o.id);
    const categories = await this.categoryRepository.find({ where: { storeId, id: In(ids) } });
    categories.forEach((cat) => {
      const match = dto.orders.find((o) => o.id === cat.id);
      if (match) cat.sortOrder = match.sortOrder;
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(MenuCategory, categories);
    });
    await this.invalidateCache(storeId).catch(() => {});
  }

  async reorderItems(storeId: string, dto: ReorderMenuItemsDto): Promise<void> {
    const ids = dto.orders.map((o) => o.id);
    const items = await this.itemRepository.find({ where: { storeId, id: In(ids) } });
    items.forEach((item) => {
      const match = dto.orders.find((o) => o.id === item.id);
      if (match) item.sortOrder = match.sortOrder;
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(MenuItem, items);
    });
    await this.invalidateCache(storeId).catch(() => {});
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
        const counts = await this.dataSource.transaction(async (manager) => {
          // clearTarget이면 대상 매장 메뉴 삭제
          if (clearTarget) {
            await manager.delete(MenuCategory, { storeId: targetStoreId });
          }

          let categoriesCreated = 0;
          let itemsCreated = 0;

          for (const srcCategory of sourceCategories) {
            // 카테고리 복사
            const newCategory = manager.create(MenuCategory, {
              storeId: targetStoreId,
              name: srcCategory.name,
              description: srcCategory.description,
              imageUrl: srcCategory.imageUrl,
              sortOrder: srcCategory.sortOrder,
              isActive: srcCategory.isActive,
            });
            const savedCategory = await manager.save(MenuCategory, newCategory);
            categoriesCreated++;

            // 아이템 복사
            for (const srcItem of srcCategory.items ?? []) {
              const newItem = manager.create(MenuItem, {
                categoryId: savedCategory.id,
                storeId: targetStoreId,
                name: srcItem.name,
                description: srcItem.description,
                price: srcItem.price,
                imageUrl: srcItem.imageUrl,
                isAvailable: srcItem.isAvailable,
                sortOrder: srcItem.sortOrder,
              });
              const savedItem = await manager.save(MenuItem, newItem);
              itemsCreated++;

              // 옵션 그룹 + 옵션 복사
              for (const srcGroup of srcItem.optionGroups ?? []) {
                const newGroup = manager.create(MenuOptionGroup, {
                  menuItemId: savedItem.id,
                  name: srcGroup.name,
                  isRequired: srcGroup.isRequired,
                  maxSelect: srcGroup.maxSelect,
                  options: srcGroup.options.map((opt) =>
                    manager.create(MenuOption, {
                      name: opt.name,
                      additionalPrice: opt.additionalPrice,
                      isAvailable: opt.isAvailable,
                    }),
                  ),
                });
                await manager.save(MenuOptionGroup, newGroup);
              }
            }
          }

          return { categoriesCreated, itemsCreated };
        });

        await this.invalidateCache(targetStoreId).catch(() => {});
        results.push({ targetStoreId, success: true, ...counts });
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
