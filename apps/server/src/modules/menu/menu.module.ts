import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuOptionGroup } from './entities/menu-option-group.entity';
import { MenuOption } from './entities/menu-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MenuCategory, MenuItem, MenuOptionGroup, MenuOption])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
