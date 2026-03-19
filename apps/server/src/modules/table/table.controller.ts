import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { TableService } from '@server/modules/table/table.service';
import { CreateTableDto } from '@server/modules/table/dto/create-table.dto';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { CurrentStoreId } from '@server/common/decorators/current-store-id.decorator';

@ApiTags('tables')
@Controller('tables')
export class TableController {
  constructor(
    private readonly tableService: TableService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '테이블 목록 조회' })
  findAll(@CurrentStoreId(false) storeId: string | null) {
    return this.tableService.findAll(storeId);
  }

  @Get('dev/with-tokens')
  @ApiExcludeEndpoint()
  async findAllWithTokens(
    @CurrentStoreId(false) storeId: string | null,
    @Query('storeId') queryStoreId?: string,
  ) {
    return this.tableService.findAllWithTokens(queryStoreId || storeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '테이블 생성' })
  create(@CurrentStoreId() storeId: string, @Body() dto: CreateTableDto) {
    return this.tableService.create(storeId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '테이블 삭제' })
  remove(@Param('id') id: string) {
    return this.tableService.remove(id);
  }

  @Post(':id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'QR 토큰 발급' })
  generateQr(@Param('id') id: string) {
    return this.tableService.generateQrToken(id);
  }

  @Get(':id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'QR 토큰 조회' })
  getQr(@Param('id') id: string) {
    return this.tableService.getQrToken(id);
  }
}
