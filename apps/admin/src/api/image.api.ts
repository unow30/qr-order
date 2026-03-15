import client from './client';
import { EntityImage, ImageEntityType, ReviewImage, CreateImageDto, UpdateImageDto } from '@qr-order/shared-types';

export const getImages = (entityType: ImageEntityType, entityId: string): Promise<EntityImage[]> =>
  client.get(`/images/${entityType}/${entityId}`);

export const getActiveImages = (entityType: ImageEntityType, entityId: string): Promise<EntityImage[]> =>
  client.get(`/images/${entityType}/${entityId}/active`);

export const createImage = (
  entityType: ImageEntityType,
  entityId: string,
  dto: CreateImageDto,
): Promise<EntityImage> =>
  client.post(`/images/${entityType}/${entityId}`, dto);

export const updateImage = (
  entityType: ImageEntityType,
  entityId: string,
  imageId: string,
  dto: UpdateImageDto,
): Promise<EntityImage> =>
  client.put(`/images/${entityType}/${entityId}/${imageId}`, dto);

export const deleteImage = (
  entityType: ImageEntityType,
  entityId: string,
  imageId: string,
): Promise<void> =>
  client.delete(`/images/${entityType}/${entityId}/${imageId}`);

export const getReviewImages = (reviewId: string): Promise<ReviewImage[]> =>
  client.get(`/images/reviews/${reviewId}`);

export const deleteReviewImage = (reviewId: string, imageId: string): Promise<void> =>
  client.delete(`/reviews/${reviewId}/images/${imageId}`);
