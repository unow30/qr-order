import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuController } from '@server/modules/menu/menu.controller';
import { MenuService } from '@server/modules/menu/menu.service';
import { MenuCategory } from '@server/modules/menu/entities/menu-category.entity';
import { MenuItem } from '@server/modules/menu/entities/menu-item.entity';
import { MenuOptionGroup } from '@server/modules/menu/entities/menu-option-group.entity';
import { MenuOption } from '@server/modules/menu/entities/menu-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MenuCategory, MenuItem, MenuOptionGroup, MenuOption])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
