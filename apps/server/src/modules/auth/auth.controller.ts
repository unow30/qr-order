import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from '@server/modules/auth/auth.service';
import { LocalAuthGuard } from '@server/modules/auth/guards/local-auth.guard';
import { LoginDto } from '@server/modules/auth/dto/login.dto';
import { StoreEntity } from '@server/modules/store/entities/store.entity';

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
    req: { user: { id: string; username: string; role: string; stores: StoreEntity[] } },
  ) {
    return this.authService.login(req.user);
  }
}
