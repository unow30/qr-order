import client from './client';

export interface ReviewItem {
  id: string;
  storeId: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  sessionToken: string;
  rating: number;
  comment?: string;
  isVisible: boolean;
  createdAt: string;
}

export const getReviews = (): Promise<ReviewItem[]> => client.get('/reviews');

export const toggleReviewVisibility = (id: string): Promise<ReviewItem> =>
  client.put(`/reviews/${id}/visibility`, {});

export const deleteReview = (id: string): Promise<void> =>
  client.delete(`/reviews/${id}`);
