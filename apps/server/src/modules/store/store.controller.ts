import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('stores')
@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly configService: ConfigService,
  ) {}

  @Get('dev/list')
  @Public()
  @ApiExcludeEndpoint()
  async devList() {
    if (this.configService.get('NODE_ENV') === 'production') {
      return { message: '프로덕션 환경에서는 사용할 수 없습니다.' };
    }
    return this.storeService.findAll();
  }

  @Get()
  @ApiOperation({ summary: '전체 매장 목록 조회' })
  findAll() {
    return this.storeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '매장 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '신규 매장 등록' })
  create(@Body() dto: CreateStoreDto) {
    return this.storeService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '매장 정보 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '매장 비활성화 (소프트 삭제)' })
  deactivate(@Param('id') id: string) {
    return this.storeService.deactivate(id);
  }
}
