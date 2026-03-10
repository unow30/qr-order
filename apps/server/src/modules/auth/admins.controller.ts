import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('admins')
@Controller('admins')
@UseGuards(JwtAuthGuard)
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
