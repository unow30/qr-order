import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

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
  findAll() {
    return this.tableService.findAll();
  }

  @Get('dev/with-tokens')
  @ApiExcludeEndpoint()
  async findAllWithTokens() {
    if (this.configService.get('NODE_ENV') === 'production') {
      return { message: '프로덕션 환경에서는 사용할 수 없습니다.' };
    }
    return this.tableService.findAllWithTokens();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '테이블 생성' })
  create(@Body() dto: CreateTableDto) {
    return this.tableService.create(dto);
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
