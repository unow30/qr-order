import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageController } from '@server/modules/image/image.controller';
import { ImageService } from '@server/modules/image/image.service';
import { ImageMigrationService } from '@server/modules/image/image-migration.service';
import { StoreImageEntity } from '@server/modules/image/entities/store-image.entity';
import { TableImageEntity } from '@server/modules/image/entities/table-image.entity';
import { MenuCategoryImageEntity } from '@server/modules/image/entities/menu-category-image.entity';
import { MenuItemImageEntity } from '@server/modules/image/entities/menu-item-image.entity';
import { CouponImageEntity } from '@server/modules/image/entities/coupon-image.entity';
import { ReviewImageEntity } from '@server/modules/image/entities/review-image.entity';
import { MenuCategory } from '@server/modules/menu/entities/menu-category.entity';
import { MenuItem } from '@server/modules/menu/entities/menu-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreImageEntity,
      TableImageEntity,
      MenuCategoryImageEntity,
      MenuItemImageEntity,
      CouponImageEntity,
      ReviewImageEntity,
      MenuCategory,
      MenuItem,
    ]),
  ],
  controllers: [ImageController],
  providers: [ImageService, ImageMigrationService],
  exports: [ImageService],
})
export class ImageModule {}
