export interface Review {
  id: string;
  storeId: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  sessionToken: string;
  rating: number;       // 1~5
  comment?: string;
  isVisible: boolean;
  createdAt: Date;
}
