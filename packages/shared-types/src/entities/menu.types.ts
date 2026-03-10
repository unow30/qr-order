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
  imageUrl?: string;
  isAvailable: boolean;
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
