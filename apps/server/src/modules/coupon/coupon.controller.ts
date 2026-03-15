import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentStoreId } from '../../common/decorators/current-store-id.decorator';
import { CreateCouponDto, ApplyCouponDto } from '@qr-order/shared-types';

@ApiTags('coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ─── 어드민 전용 ────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'STORE_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '쿠폰 목록 조회 (어드민)' })
  findAll(@CurrentStoreId(false) storeId: string | null) {
    return this.couponService.findAll(storeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'STORE_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '쿠폰 생성 (어드민)' })
  create(@CurrentStoreId() storeId: string, @Body() dto: CreateCouponDto) {
    return this.couponService.create(storeId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'STORE_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '쿠폰 비활성화 (어드민)' })
  deactivate(@CurrentStoreId() storeId: string, @Param('id') id: string) {
    return this.couponService.deactivate(storeId, id);
  }

  // ─── 고객 전용 (세션 인증 불필요, X-Store-Id 헤더 필요) ───────────

  @Post('validate')
  @ApiOperation({ summary: '쿠폰 유효성 검증 + 할인 금액 계산 (고객)' })
  @ApiQuery({ name: 'amount', required: true, description: '현재 주문 금액' })
  validateCoupon(
    @CurrentStoreId() storeId: string,
    @Body() dto: ApplyCouponDto,
    @Query('amount') amount: string,
  ) {
    return this.couponService.validate(storeId, dto.code, parseInt(amount, 10) || 0);
  }
}
