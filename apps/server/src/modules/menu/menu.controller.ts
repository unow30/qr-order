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
import { CurrentStoreId } from '../../common/decorators/current-store-id.decorator';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuOptionGroupDto,
  DeployMenuDto,
} from '@qr-order/shared-types';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: '메뉴 전체 조회 (Redis 캐시). SUPER_ADMIN은 storeId 없이 전체 조회 가능.' })
  getMenu(@CurrentStoreId(false) storeId: string | null) {
    return this.menuService.getMenu(storeId);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 생성' })
  createCategory(@CurrentStoreId() storeId: string, @Body() dto: CreateMenuCategoryDto) {
    return this.menuService.createCategory(storeId, dto);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 수정' })
  updateCategory(
    @CurrentStoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.menuService.updateCategory(storeId, id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 삭제' })
  deleteCategory(@CurrentStoreId() storeId: string, @Param('id') id: string) {
    return this.menuService.deleteCategory(storeId, id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 생성' })
  createItem(@CurrentStoreId() storeId: string, @Body() dto: CreateMenuItemDto) {
    return this.menuService.createItem(storeId, dto);
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 수정' })
  updateItem(
    @CurrentStoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(storeId, id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 삭제' })
  deleteItem(@CurrentStoreId() storeId: string, @Param('id') id: string) {
    return this.menuService.deleteItem(storeId, id);
  }

  @Post('option-groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 그룹 생성' })
  createOptionGroup(@CurrentStoreId() storeId: string, @Body() dto: CreateMenuOptionGroupDto) {
    return this.menuService.createOptionGroup(storeId, dto);
  }

  @Post('deploy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 템플릿 배포 (SUPER_ADMIN 전용) — 소스 매장 메뉴를 여러 대상 매장에 복사' })
  deployMenu(@Body() dto: DeployMenuDto) {
    return this.menuService.deployMenu(dto);
  }

  @Put('items/:id/stock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메뉴 아이템 재고 업데이트 (어드민)' })
  updateStock(
    @CurrentStoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: { stock: number; stockEnabled: boolean },
  ) {
    return this.menuService.updateStock(storeId, id, dto.stock, dto.stockEnabled);
  }
}
