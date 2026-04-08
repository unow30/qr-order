import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from '@server/modules/menu/menu.service';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { CurrentStoreId } from '@server/common/decorators/current-store-id.decorator';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuOptionGroupDto,
  DeployMenuDto,
  ReorderMenuCategoriesDto,
  ReorderMenuItemsDto,
  ReorderOptionGroupsDto,
  ReorderOptionsDto,
} from '@qr-order/shared-types';
import { RolesGuard } from '@server/common/guards/roles.guard';
import { Roles } from '@server/common/decorators/roles.decorator';

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

  @Patch('categories/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 순서 일괄 변경' })
  reorderCategories(@CurrentStoreId() storeId: string, @Body() dto: ReorderMenuCategoriesDto) {
    return this.menuService.reorderCategories(storeId, dto);
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

  @Patch('items/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '아이템 순서 일괄 변경' })
  reorderItems(@CurrentStoreId() storeId: string, @Body() dto: ReorderMenuItemsDto) {
    return this.menuService.reorderItems(storeId, dto);
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

  @Patch('option-groups/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 그룹 순서 일괄 변경' })
  reorderOptionGroups(@CurrentStoreId() storeId: string, @Body() dto: ReorderOptionGroupsDto) {
    return this.menuService.reorderOptionGroups(storeId, dto);
  }

  @Delete('option-groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 그룹 삭제' })
  deleteOptionGroup(@CurrentStoreId() storeId: string, @Param('id') id: string) {
    return this.menuService.deleteOptionGroup(storeId, id);
  }

  @Post('options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 생성' })
  createOption(
    @CurrentStoreId() storeId: string,
    @Body() dto: { groupId: string; name: string; additionalPrice: number },
  ) {
    return this.menuService.createOption(storeId, dto);
  }

  @Delete('options/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 삭제' })
  deleteOption(@CurrentStoreId() storeId: string, @Param('id') id: string) {
    return this.menuService.deleteOption(storeId, id);
  }

  @Patch('options/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '옵션 순서 일괄 변경' })
  reorderOptions(@CurrentStoreId() storeId: string, @Body() dto: ReorderOptionsDto) {
    return this.menuService.reorderOptions(storeId, dto);
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
