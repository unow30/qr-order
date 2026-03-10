import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../config/redis.config';
import { SessionService } from '../session/session.service';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { Cart, CartItem, AddCartItemDto, UpdateCartItemDto } from '@qr-order/shared-types';

const CART_PREFIX = 'cart:';

@Injectable()
export class CartService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly sessionService: SessionService,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  private getCartKey(storeId: string, sessionToken: string): string {
    return `${CART_PREFIX}${storeId}:${sessionToken}`;
  }

  async getCart(sessionToken: string): Promise<Cart> {
    const session = await this.sessionService.validateSession(sessionToken);
    const data = await this.redis.get(this.getCartKey(session.storeId, sessionToken));
    const items: CartItem[] = data ? JSON.parse(data) : [];
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { sessionId: session.tableId, items, totalAmount };
  }

  async addItem(sessionToken: string, dto: AddCartItemDto): Promise<Cart> {
    const session = await this.sessionService.validateSession(sessionToken);
    const cartKey = this.getCartKey(session.storeId, sessionToken);

    const menuItem = await this.menuItemRepository.findOne({
      where: { id: dto.menuItemId },
      relations: ['optionGroups', 'optionGroups.options'],
    });
    if (!menuItem) throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');

    const optionsPrice = dto.selectedOptions.reduce(
      (sum, opt) => sum + opt.additionalPrice,
      0,
    );
    const unitPrice = menuItem.price + optionsPrice;
    const totalPrice = unitPrice * dto.quantity;

    const cartItem: CartItem = {
      cartItemId: uuidv4(),
      menuItemId: dto.menuItemId,
      menuItemName: menuItem.name,
      quantity: dto.quantity,
      unitPrice,
      totalPrice,
      selectedOptions: dto.selectedOptions,
    };

    const data = await this.redis.get(cartKey);
    const items: CartItem[] = data ? JSON.parse(data) : [];
    items.push(cartItem);

    const sessionKey = this.sessionService.getSessionKey(session.storeId, sessionToken);
    const ttl = await this.redis.ttl(sessionKey);
    await this.redis.setex(cartKey, ttl > 0 ? ttl : 7200, JSON.stringify(items));
    await this.sessionService.renewSession(sessionToken);

    return this.getCart(sessionToken);
  }

  async updateItem(sessionToken: string, cartItemId: string, dto: UpdateCartItemDto): Promise<Cart> {
    const session = await this.sessionService.validateSession(sessionToken);
    const cartKey = this.getCartKey(session.storeId, sessionToken);

    const data = await this.redis.get(cartKey);
    const items: CartItem[] = data ? JSON.parse(data) : [];
    const idx = items.findIndex((i) => i.cartItemId === cartItemId);
    if (idx === -1) throw new NotFoundException('장바구니 아이템을 찾을 수 없습니다.');

    if (dto.quantity !== undefined) {
      items[idx].quantity = dto.quantity;
      items[idx].totalPrice = items[idx].unitPrice * dto.quantity;
    }
    if (dto.selectedOptions !== undefined) {
      items[idx].selectedOptions = dto.selectedOptions;
    }

    const sessionKey = this.sessionService.getSessionKey(session.storeId, sessionToken);
    const ttl = await this.redis.ttl(sessionKey);
    await this.redis.setex(cartKey, ttl > 0 ? ttl : 7200, JSON.stringify(items));

    return this.getCart(sessionToken);
  }

  async removeItem(sessionToken: string, cartItemId: string): Promise<Cart> {
    const session = await this.sessionService.validateSession(sessionToken);
    const cartKey = this.getCartKey(session.storeId, sessionToken);

    const data = await this.redis.get(cartKey);
    const items: CartItem[] = data ? JSON.parse(data) : [];
    const filtered = items.filter((i) => i.cartItemId !== cartItemId);

    const sessionKey = this.sessionService.getSessionKey(session.storeId, sessionToken);
    const ttl = await this.redis.ttl(sessionKey);
    await this.redis.setex(cartKey, ttl > 0 ? ttl : 7200, JSON.stringify(filtered));

    return this.getCart(sessionToken);
  }

  async clearCart(sessionToken: string): Promise<void> {
    const session = await this.sessionService.validateSession(sessionToken);
    await this.redis.del(this.getCartKey(session.storeId, sessionToken));
  }

  async getCartItems(sessionToken: string): Promise<CartItem[]> {
    const cart = await this.getCart(sessionToken);
    return cart.items;
  }
}
