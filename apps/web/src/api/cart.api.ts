import client from './client';
import { Cart, AddCartItemDto, UpdateCartItemDto } from '@qr-order/shared-types';

export const getCart = (): Promise<Cart> => client.get('/cart');
export const addCartItem = (dto: AddCartItemDto): Promise<Cart> => client.post('/cart/items', dto);
export const updateCartItem = (cartItemId: string, dto: UpdateCartItemDto): Promise<Cart> =>
  client.patch(`/cart/items/${cartItemId}`, dto);
export const removeCartItem = (cartItemId: string): Promise<Cart> =>
  client.delete(`/cart/items/${cartItemId}`);
