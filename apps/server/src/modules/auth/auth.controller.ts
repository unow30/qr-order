import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '관리자 로그인' })
  @ApiBody({ type: LoginDto })
  login(
    @Request()
    req: { user: { id: string; username: string; role: string; storeId: string | null } },
  ) {
    return this.authService.login(req.user);
  }
}
