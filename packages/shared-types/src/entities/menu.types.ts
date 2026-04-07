import type { EntityImage } from './image.types';

export interface MenuCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  /** @deprecated menu_item_images 테이블의 images 배열을 사용하세요. */
  imageUrl?: string;
  /** 활성/스케줄 필터 적용 후 priority DESC, sortOrder ASC 로 정렬된 이미지 배열 */
  images?: EntityImage[];
  isAvailable: boolean;
  stockEnabled: boolean;   // F10: 재고 관리 활성화 여부
  stock: number;           // F10: 현재 재고 수량
  sortOrder: number;
  optionGroups: MenuOptionGroup[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuOptionGroup {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuOption {
  id: string;
  groupId: string;
  name: string;
  additionalPrice: number;
  isAvailable: boolean;
}
