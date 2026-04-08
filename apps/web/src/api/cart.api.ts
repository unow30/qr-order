import client from '@web/api/client';
import { Cart, AddCartItemDto, UpdateCartItemDto } from '@qr-order/shared-types';
import { useSessionStore } from '@web/stores/sessionStore';

export const getCart = (): Promise<Cart> => client.get('/cart');

export const addCartItem = async (dto: AddCartItemDto): Promise<Cart> => {
  const cart = await client.post<never, Cart>('/cart/items', dto);
  // 서버 renewSession과 동기화: 클라이언트 expiresAt 연장
  useSessionStore.getState().renewExpiry();
  return cart;
};

export const updateCartItem = (cartItemId: string, dto: UpdateCartItemDto): Promise<Cart> =>
  client.patch(`/cart/items/${cartItemId}`, dto);
export const removeCartItem = (cartItemId: string): Promise<Cart> =>
  client.delete(`/cart/items/${cartItemId}`);
