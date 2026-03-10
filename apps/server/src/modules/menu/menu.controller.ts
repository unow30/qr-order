import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuOptionGroupDto,
} from '@qr-order/shared-types';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: '메뉴 전체 조회 (Redis 캐시)' })
  getMenu() {
    return this.menuService.getMenu();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 생성' })
  createCategory(@Body() dto: CreateMenuCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 수정' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateMenuCategoryDto) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 삭제' })
  deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 생성' })
  createItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createItem(dto);
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 수정' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 삭제' })
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(id);
  }

  @Post('option-groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 그룹 생성' })
  createOptionGroup(@Body() dto: CreateMenuOptionGroupDto) {
    return this.menuService.createOptionGroup(dto);
  }
}
