import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CartService } from '@server/modules/cart/cart.service';
import { AddCartItemDto, UpdateCartItemDto } from '@qr-order/shared-types';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private getSessionToken(headers: Record<string, string>): string {
    const token = headers['x-session-token'];
    if (!token) throw new UnauthorizedException('세션 토큰이 필요합니다.');
    return token;
  }

  @Get()
  @ApiOperation({ summary: '장바구니 조회' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  getCart(@Headers() headers: Record<string, string>) {
    return this.cartService.getCart(this.getSessionToken(headers));
  }

  @Post('items')
  @ApiOperation({ summary: '장바구니 추가' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  addItem(
    @Headers() headers: Record<string, string>,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(this.getSessionToken(headers), dto);
  }

  @Patch('items/:cartItemId')
  @ApiOperation({ summary: '장바구니 수량/옵션 변경' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  updateItem(
    @Headers() headers: Record<string, string>,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(this.getSessionToken(headers), cartItemId, dto);
  }

  @Delete('items/:cartItemId')
  @ApiOperation({ summary: '장바구니 아이템 삭제' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  removeItem(
    @Headers() headers: Record<string, string>,
    @Param('cartItemId') cartItemId: string,
  ) {
    return this.cartService.removeItem(this.getSessionToken(headers), cartItemId);
  }
}
