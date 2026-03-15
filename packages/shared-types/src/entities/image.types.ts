export type ImageEntityType =
  | 'stores'
  | 'tables'
  | 'menu-categories'
  | 'menu-items'
  | 'coupons'
  | 'reviews';

export interface EntityImage {
  id: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
  isActive: boolean;
  priority: number;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewImage {
  id: string;
  reviewId: string;
  storeId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
}
