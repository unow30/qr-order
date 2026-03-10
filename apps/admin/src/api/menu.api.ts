import client from './client';
import {
  MenuCategory,
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '@qr-order/shared-types';

export const getMenu = (): Promise<MenuCategory[]> => client.get('/menu');
export const createCategory = (dto: CreateMenuCategoryDto): Promise<MenuCategory> =>
  client.post('/menu/categories', dto);
export const updateCategory = (id: string, dto: UpdateMenuCategoryDto): Promise<MenuCategory> =>
  client.put(`/menu/categories/${id}`, dto);
export const deleteCategory = (id: string): Promise<void> => client.delete(`/menu/categories/${id}`);
export const createItem = (dto: CreateMenuItemDto) => client.post('/menu/items', dto);
export const updateItem = (id: string, dto: UpdateMenuItemDto) =>
  client.put(`/menu/items/${id}`, dto);
export const deleteItem = (id: string): Promise<void> => client.delete(`/menu/items/${id}`);
