import client from '@admin/api/client';
import {
  EntityImage,
  ImageEntityType,
  ReviewImage,
  CreateImageDto,
  UpdateImageDto,
  PresignedUrlRequest,
  PresignedUrlResponse,
} from '@qr-order/shared-types';

export const getImages = (entityType: ImageEntityType, entityId: string, storeId?: string): Promise<EntityImage[]> =>
  client.get(`/images/${entityType}/${entityId}`, storeId ? { headers: { 'X-Store-Id': storeId } } : undefined);

export const getActiveImages = (entityType: ImageEntityType, entityId: string): Promise<EntityImage[]> =>
  client.get(`/images/${entityType}/${entityId}/active`);

export const createImage = (
  entityType: ImageEntityType,
  entityId: string,
  dto: CreateImageDto,
  storeId?: string,
): Promise<EntityImage> =>
  client.post(`/images/${entityType}/${entityId}`, dto, storeId ? { headers: { 'X-Store-Id': storeId } } : undefined);

export const updateImage = (
  entityType: ImageEntityType,
  entityId: string,
  imageId: string,
  dto: UpdateImageDto,
  storeId?: string,
): Promise<EntityImage> =>
  client.put(`/images/${entityType}/${entityId}/${imageId}`, dto, storeId ? { headers: { 'X-Store-Id': storeId } } : undefined);

export const deleteImage = (
  entityType: ImageEntityType,
  entityId: string,
  imageId: string,
  storeId?: string,
): Promise<void> =>
  client.delete(`/images/${entityType}/${entityId}/${imageId}`, storeId ? { headers: { 'X-Store-Id': storeId } } : undefined);

export const getReviewImages = (reviewId: string): Promise<ReviewImage[]> =>
  client.get(`/images/reviews/${reviewId}`);

export const deleteReviewImage = (reviewId: string, imageId: string): Promise<void> =>
  client.delete(`/reviews/${reviewId}/images/${imageId}`);

export const getPresignedUrl = (dto: PresignedUrlRequest, storeId?: string): Promise<PresignedUrlResponse> =>
  client.post('/images/presigned-url', dto, storeId ? { headers: { 'X-Store-Id': storeId } } : undefined);

export const uploadToS3 = async (presignedUrl: string, file: File): Promise<void> => {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`S3 업로드 실패: ${res.status}`);
  }
};
