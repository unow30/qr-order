import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '@server/modules/auth/auth.service';
import { CreateAdminDto } from '@server/modules/auth/dto/create-admin.dto';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@server/common/guards/roles.guard';
import { Roles } from '@server/common/decorators/roles.decorator';

@ApiTags('admins')
@Controller('admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class AdminsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: '어드민 계정 목록 조회' })
  findAll() {
    return this.authService.findAllAdmins();
  }

  @Post()
  @ApiOperation({ summary: '어드민 계정 생성 (SUPER_ADMIN 전용)' })
  create(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }
}
