import { SelectedOption } from '../entities/order.types';

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions: SelectedOption[];
}

export interface Cart {
  sessionId: string;
  items: CartItem[];
  totalAmount: number;
}

export interface AddCartItemDto {
  menuItemId: string;
  quantity: number;
  selectedOptions: SelectedOption[];
}

export interface UpdateCartItemDto {
  quantity?: number;
  selectedOptions?: SelectedOption[];
}
