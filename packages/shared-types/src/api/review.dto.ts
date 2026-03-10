export interface CreateReviewDto {
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  rating: number;       // 1~5
  comment?: string;
}

export interface UpdateReviewVisibilityDto {
  isVisible: boolean;
}
