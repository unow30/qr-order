import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async onModuleInit() {
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
