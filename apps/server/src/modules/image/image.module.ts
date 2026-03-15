import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { ImageMigrationService } from './image-migration.service';
import { StoreImageEntity } from './entities/store-image.entity';
import { TableImageEntity } from './entities/table-image.entity';
import { MenuCategoryImageEntity } from './entities/menu-category-image.entity';
import { MenuItemImageEntity } from './entities/menu-item-image.entity';
import { CouponImageEntity } from './entities/coupon-image.entity';
import { ReviewImageEntity } from './entities/review-image.entity';
import { MenuCategory } from '../menu/entities/menu-category.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';

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
