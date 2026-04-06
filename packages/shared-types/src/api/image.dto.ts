export interface CreateImageDto {
  imageUrl: string;
  altText?: string;
  sortOrder?: number;
  priority?: number;
  startAt?: string | null;
  endAt?: string | null;
}

export interface UpdateImageDto {
  imageUrl?: string;
  altText?: string;
  sortOrder?: number;
  priority?: number;
  startAt?: string | null;
  endAt?: string | null;
  isActive?: boolean;
}

export interface CreateReviewImageDto {
  imageUrl: string;
}

export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
  contentLength: number;
  entityType: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  imageUrl: string;
  key: string;
}
