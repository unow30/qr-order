import { MenuCategory, MenuItem, MenuOptionGroup } from '../entities/menu.types';

export interface MenuListResponse {
  categories: MenuCategory[];
}

export interface CreateMenuCategoryDto {
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateMenuCategoryDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemDto {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateMenuItemDto {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  sortOrder?: number;
  isAvailable?: boolean;
  categoryId?: string;
}

export interface CreateMenuOptionGroupDto {
  menuItemId: string;
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: CreateMenuOptionDto[];
}

export interface CreateMenuOptionDto {
  name: string;
  additionalPrice: number;
}
