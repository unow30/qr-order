import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportQueryDto } from '@qr-order/shared-types';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '전체 매장 통합 리포트 (SUPER_ADMIN 전용)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getOverallSummary(@Query() query: ReportQueryDto) {
    return this.reportService.getOverallSummary(query);
  }

  @Get('stores/:storeId')
  @ApiOperation({ summary: '특정 매장 리포트 (SUPER_ADMIN 또는 해당 STORE_ADMIN)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getStoreSummary(
    @Param('storeId') storeId: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: { role: string; storeId: string | null },
  ) {
    // STORE_ADMIN은 본인 매장만 접근 가능
    const targetStoreId =
      user.role === 'STORE_ADMIN' ? user.storeId ?? storeId : storeId;
    return this.reportService.getStoreSummary(targetStoreId, query);
  }
}
