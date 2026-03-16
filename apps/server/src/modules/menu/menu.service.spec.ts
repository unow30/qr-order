import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuService } from './menu.service';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuOptionGroup } from './entities/menu-option-group.entity';
import { MenuOption } from './entities/menu-option.entity';
import { REDIS_CLIENT } from '../../config/redis.config';
import { createMockRepository, MockRepository } from '../../../test/helpers/mock-repository';

describe('MenuService', () => {
  let service: MenuService;
  let categoryRepo: MockRepository<MenuCategory>;
  let itemRepo: MockRepository<MenuItem>;
  let optionGroupRepo: MockRepository<MenuOptionGroup>;
  let optionRepo: MockRepository<MenuOption>;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    categoryRepo = createMockRepository<MenuCategory>();
    itemRepo = createMockRepository<MenuItem>();
    optionGroupRepo = createMockRepository<MenuOptionGroup>();
    optionRepo = createMockRepository<MenuOption>();
    redis = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(MenuCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(MenuItem), useValue: itemRepo },
        { provide: getRepositoryToken(MenuOptionGroup), useValue: optionGroupRepo },
        { provide: getRepositoryToken(MenuOption), useValue: optionRepo },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  describe('getMenu', () => {
    it('storeId가 null이면 캐시 없이 전체 조회해야 한다', async () => {
      categoryRepo.find!.mockResolvedValue([]);

      await service.getMenu(null);

      expect(redis.get).not.toHaveBeenCalled();
      expect(categoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('캐시가 있으면 캐시에서 반환해야 한다', async () => {
      const cached = [{ id: 'cat-1', name: '커피' }];
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getMenu('store-1');

      expect(result).toEqual(cached);
      expect(categoryRepo.find).not.toHaveBeenCalled();
    });

    it('캐시가 없으면 DB 조회 후 캐시에 저장해야 한다', async () => {
      redis.get.mockResolvedValue(null);
      const categories = [{ id: 'cat-1', name: '커피', items: [] }];
      categoryRepo.find!.mockResolvedValue(categories);

      const result = await service.getMenu('store-1');

      expect(result).toEqual(categories);
      expect(redis.setex).toHaveBeenCalledWith(
        'menu:store-1:all',
        300,
        JSON.stringify(categories),
      );
    });
  });

  describe('invalidateCache', () => {
    it('메뉴 캐시를 삭제해야 한다', async () => {
      await service.invalidateCache('store-1');

      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });
  });

  describe('createCategory', () => {
    it('카테고리를 생성하고 캐시를 무효화해야 한다', async () => {
      const dto = { name: '음료', description: '차가운 음료' };
      categoryRepo.save!.mockResolvedValue({ id: 'cat-1', ...dto, storeId: 'store-1' });

      const result = await service.createCategory('store-1', dto);

      expect(categoryRepo.create).toHaveBeenCalledWith({ ...dto, storeId: 'store-1' });
      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });
  });

  describe('updateCategory', () => {
    it('카테고리를 업데이트하고 캐시를 무효화해야 한다', async () => {
      const existing = { id: 'cat-1', name: '음료', storeId: 'store-1' };
      categoryRepo.findOne!.mockResolvedValue(existing);
      categoryRepo.save!.mockResolvedValue({ ...existing, name: '커피' });

      await service.updateCategory('store-1', 'cat-1', { name: '커피' });

      expect(categoryRepo.save).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });

    it('카테고리가 없으면 NotFoundException을 던져야 한다', async () => {
      categoryRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateCategory('store-1', 'nonexistent', { name: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCategory', () => {
    it('카테고리를 삭제하고 캐시를 무효화해야 한다', async () => {
      await service.deleteCategory('store-1', 'cat-1');

      expect(categoryRepo.delete).toHaveBeenCalledWith({
        id: 'cat-1',
        storeId: 'store-1',
      });
      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });
  });

  describe('createItem', () => {
    it('메뉴 아이템을 생성하고 캐시를 무효화해야 한다', async () => {
      const dto = { categoryId: 'cat-1', name: '아메리카노', price: 4500 };
      itemRepo.save!.mockResolvedValue({ id: 'item-1', ...dto, storeId: 'store-1' });

      await service.createItem('store-1', dto);

      expect(itemRepo.create).toHaveBeenCalledWith({ ...dto, storeId: 'store-1' });
      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });
  });

  describe('decrementStock', () => {
    it('재고가 활성화된 아이템의 재고를 차감해야 한다', async () => {
      itemRepo.findOne!.mockResolvedValue({
        id: 'item-1',
        stock: 10,
        stockEnabled: true,
        isAvailable: true,
      });

      await service.decrementStock(
        [{ menuItemId: 'item-1', quantity: 3 }],
        'store-1',
      );

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 7, isAvailable: true }),
      );
      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });

    it('재고가 0이 되면 품절 처리해야 한다', async () => {
      itemRepo.findOne!.mockResolvedValue({
        id: 'item-1',
        stock: 2,
        stockEnabled: true,
        isAvailable: true,
      });

      await service.decrementStock(
        [{ menuItemId: 'item-1', quantity: 5 }],
        'store-1',
      );

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 0, isAvailable: false }),
      );
    });

    it('재고 관리가 비활성화된 아이템은 건너뛰어야 한다', async () => {
      itemRepo.findOne!.mockResolvedValue({
        id: 'item-1',
        stock: 0,
        stockEnabled: false,
        isAvailable: true,
      });

      await service.decrementStock(
        [{ menuItemId: 'item-1', quantity: 1 }],
        'store-1',
      );

      expect(itemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('재고를 수동 업데이트해야 한다', async () => {
      itemRepo.findOne!.mockResolvedValue({
        id: 'item-1',
        stock: 0,
        stockEnabled: false,
        isAvailable: false,
      });
      itemRepo.save!.mockResolvedValue({
        id: 'item-1',
        stock: 50,
        stockEnabled: true,
        isAvailable: true,
      });

      const result = await service.updateStock('store-1', 'item-1', 50, true);

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: 50,
          stockEnabled: true,
          isAvailable: true,
        }),
      );
      expect(redis.del).toHaveBeenCalledWith('menu:store-1:all');
    });

    it('아이템이 없으면 NotFoundException을 던져야 한다', async () => {
      itemRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateStock('store-1', 'nonexistent', 10, true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deployMenu', () => {
    it('소스 매장의 메뉴를 대상 매장에 복사해야 한다', async () => {
      const sourceCategories = [
        {
          id: 'cat-1',
          name: '커피',
          description: '커피 종류',
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          items: [
            {
              id: 'item-1',
              name: '아메리카노',
              description: '깔끔한 커피',
              price: 4500,
              imageUrl: null,
              isAvailable: true,
              sortOrder: 1,
              optionGroups: [],
            },
          ],
        },
      ];
      categoryRepo.find!.mockResolvedValue(sourceCategories);
      categoryRepo.save!.mockResolvedValue({ id: 'new-cat-1' });
      itemRepo.save!.mockResolvedValue({ id: 'new-item-1' });

      const results = await service.deployMenu({
        sourceStoreId: 'store-1',
        targetStoreIds: ['store-2'],
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(
        expect.objectContaining({
          targetStoreId: 'store-2',
          success: true,
          categoriesCreated: 1,
          itemsCreated: 1,
        }),
      );
      expect(redis.del).toHaveBeenCalledWith('menu:store-2:all');
    });

    it('clearTarget이면 대상 매장 메뉴를 삭제한 후 복사해야 한다', async () => {
      categoryRepo.find!.mockResolvedValue([]);

      await service.deployMenu({
        sourceStoreId: 'store-1',
        targetStoreIds: ['store-2'],
        clearTarget: true,
      });

      expect(categoryRepo.delete).toHaveBeenCalledWith({
        storeId: 'store-2',
      });
    });

    it('대상 매장 배포 실패 시 에러를 결과에 포함해야 한다', async () => {
      categoryRepo.find!.mockResolvedValue([
        {
          id: 'cat-1',
          name: '커피',
          items: [],
          description: null,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
        },
      ]);
      categoryRepo.save!.mockRejectedValue(new Error('DB error'));

      const results = await service.deployMenu({
        sourceStoreId: 'store-1',
        targetStoreIds: ['store-2'],
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('DB error');
    });
  });
});
