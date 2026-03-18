import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { OrderService } from '@server/modules/order/order.service';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { CurrentStoreId } from '@server/common/decorators/current-store-id.decorator';
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

  @Get('my')
  @ApiOperation({ summary: '내 주문 목록 (세션 기반)' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  findMyOrders(@Headers() headers: Record<string, string>) {
    return this.orderService.findBySession(this.getSessionToken(headers));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전체 주문 목록 (어드민)' })
  findAll(@CurrentStoreId(false) storeId: string | null) {
    return this.orderService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: '주문 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Delete(':orderId/items/:itemId')
  @ApiOperation({ summary: '주문 항목 취소 (고객)' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  cancelOrderItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Headers() headers: Record<string, string>,
  ) {
    return this.orderService.cancelOrderItem(
      orderId,
      itemId,
      this.getSessionToken(headers),
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 상태 변경 (어드민)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto);
  }

  @Sse('stream/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민/KDS용 전체 주문 변경 SSE 스트림 (?token=JWT)' })
  streamAll(@CurrentStoreId(false) storeId: string | null): Observable<MessageEvent> {
    return this.orderService.getStoreStream(storeId);
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: 'SSE 주문 상태 스트림' })
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.orderService.getOrderStream(id);
  }
}
