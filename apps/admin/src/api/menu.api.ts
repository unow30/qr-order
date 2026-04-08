import client from '@admin/api/client';
import {
  MenuCategory,
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuOptionGroupDto,
  ReorderMenuCategoriesDto,
  ReorderMenuItemsDto,
  ReorderOptionGroupsDto,
  ReorderOptionsDto,
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
export const updateStock = (id: string, dto: { stock: number; stockEnabled: boolean }) =>
  client.put(`/menu/items/${id}/stock`, dto);
export const reorderCategories = (dto: ReorderMenuCategoriesDto): Promise<void> =>
  client.patch('/menu/categories/reorder', dto);
export const reorderItems = (dto: ReorderMenuItemsDto): Promise<void> =>
  client.patch('/menu/items/reorder', dto);
export const createOptionGroup = (dto: CreateMenuOptionGroupDto) =>
  client.post('/menu/option-groups', dto);
export const deleteOptionGroup = (id: string): Promise<void> =>
  client.delete(`/menu/option-groups/${id}`);
export const createOption = (dto: { groupId: string; name: string; additionalPrice: number }) =>
  client.post('/menu/options', dto);
export const deleteOption = (id: string): Promise<void> => client.delete(`/menu/options/${id}`);
export const reorderOptionGroups = (dto: ReorderOptionGroupsDto): Promise<void> =>
  client.patch('/menu/option-groups/reorder', dto);
export const reorderOptions = (dto: ReorderOptionsDto): Promise<void> =>
  client.patch('/menu/options/reorder', dto);
