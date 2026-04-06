import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from '@server/modules/session/session.service';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { CurrentStoreId } from '@server/common/decorators/current-store-id.decorator';
import {
  CreateSessionDto,
  JoinSessionDto,
  MoveSessionDto,
  AdminMoveSessionDto,
} from '@qr-order/shared-types';

@ApiTags('sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // ─── 고객용 ────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'QR → 주문 세션 생성' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PIN 입력으로 기존 세션 참여' })
  joinSession(@Body() dto: JoinSessionDto) {
    return this.sessionService.joinSession(dto);
  }

  @Post('move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '자리이동 (세션 통째 이동)' })
  moveSession(
    @Headers('x-session-token') sessionToken: string,
    @Body() dto: MoveSessionDto,
  ) {
    return this.sessionService.moveSession(sessionToken, dto.qrToken);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '고객 세션 종료 (Redis 정리)' })
  deleteSession(@Headers('x-session-token') sessionToken: string) {
    return this.sessionService.deleteSession(sessionToken);
  }

  // ─── 관리자용 ──────────────────────────────────────────────────────

  @Get('admin/tables/:tableId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[관리자] 테이블 세션 조회' })
  getTableSession(
    @CurrentStoreId() storeId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.sessionService.getTableSession(storeId, tableId);
  }

  @Post('admin/tables/:tableId/move')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[관리자] 테이블 세션 이동' })
  adminMoveSession(
    @CurrentStoreId() storeId: string,
    @Param('tableId') tableId: string,
    @Body() dto: AdminMoveSessionDto,
  ) {
    return this.sessionService.adminMoveSession(
      storeId,
      tableId,
      dto.targetTableId,
    );
  }

  @Delete('admin/tables/:tableId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[관리자] 테이블 세션 강제 삭제' })
  forceDeleteTableSession(
    @CurrentStoreId() storeId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.sessionService.forceDeleteTableSession(storeId, tableId);
  }
}
