export interface Store {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoreDto {
  name: string;
  slug: string;
}

export interface UpdateStoreDto {
  name?: string;
  isActive?: boolean;
}
