import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentStoreId } from '../../common/decorators/current-store-id.decorator';
import { CreateOrderDto, UpdateOrderStatusDto } from '@qr-order/shared-types';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  private getSessionToken(headers: Record<string, string>): string {
    const token = headers['x-session-token'];
    if (!token) throw new UnauthorizedException('세션 토큰이 필요합니다.');
    return token;
  }

  @Post()
  @ApiOperation({ summary: '장바구니 → 주문 생성' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  createOrder(
    @Headers() headers: Record<string, string>,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(this.getSessionToken(headers), dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전체 주문 목록 (어드민)' })
  findAll(@CurrentStoreId() storeId: string) {
    return this.orderService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: '주문 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 상태 변경 (어드민)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto);
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: 'SSE 주문 상태 스트림' })
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.orderService.getOrderStream(id);
  }
}
