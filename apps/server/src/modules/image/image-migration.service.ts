import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MenuCategory } from '@server/modules/menu/entities/menu-category.entity';
import { MenuItem } from '@server/modules/menu/entities/menu-item.entity';
import { ImageService } from '@server/modules/image/image.service';

@Injectable()
export class ImageMigrationService implements OnModuleInit {
  private readonly logger = new Logger(ImageMigrationService.name);

  constructor(
    @InjectRepository(MenuCategory)
    private readonly categoryRepo: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepo: Repository<MenuItem>,
    private readonly imageService: ImageService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const tableExists = await this.dataSource.query(
      `SELECT to_regclass('public.menu_categories') IS NOT NULL AS exists`,
    );
    if (!tableExists[0]?.exists) {
      this.logger.warn('이미지 마이그레이션 스킵: 테이블이 아직 생성되지 않았습니다.');
      return;
    }
    await this.migrateMenuCategoryImages();
    await this.migrateMenuItemImages();
  }

  private async migrateMenuCategoryImages(): Promise<void> {
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
    });

    let migrated = 0;
    for (const cat of categories) {
      if (!cat.imageUrl) continue;
      await this.imageService.migrateFromUrl(
        'menu-categories',
        cat.id,
        cat.storeId,
        cat.imageUrl,
      );
      migrated++;
    }

    if (migrated > 0) {
      this.logger.log(`menu_categories.imageUrl → menu_category_images: ${migrated}건 이전 완료`);
    }
  }

  private async migrateMenuItemImages(): Promise<void> {
    const items = await this.itemRepo.find({
      where: { isAvailable: true },
    });

    let migrated = 0;
    for (const item of items) {
      if (!item.imageUrl) continue;
      await this.imageService.migrateFromUrl(
        'menu-items',
        item.id,
        item.storeId,
        item.imageUrl,
      );
      migrated++;
    }

    if (migrated > 0) {
      this.logger.log(`menu_items.imageUrl → menu_item_images: ${migrated}건 이전 완료`);
    }
  }
}
