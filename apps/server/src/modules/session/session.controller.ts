import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from '@qr-order/shared-types';

@ApiTags('sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'QR → 주문 세션 생성' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(dto);
  }
}
