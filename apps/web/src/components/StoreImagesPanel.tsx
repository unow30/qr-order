import { useEffect, useState } from 'react';
import { EntityImage } from '@qr-order/shared-types';
import { getStoreActiveImages } from '@web/api/image.api';

interface Props {
  storeId: string;
}

export default function StoreImagesPanel({ storeId }: Props) {
  const [images, setImages] = useState<EntityImage[]>([]);

  useEffect(() => {
    getStoreActiveImages(storeId)
      .then(setImages)
      .catch(() => setImages([]));
  }, [storeId]);

  if (images.length === 0) {
    return (
      <div className="hidden md:flex flex-1 bg-gray-100 items-center justify-center">
        <span className="text-gray-400 text-sm">매장 이미지 없음</span>
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-1 bg-gray-50 overflow-hidden relative">
      <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.imageUrl}
            alt={img.altText ?? '매장 이미지'}
            className="snap-center shrink-0 w-full h-full object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          {images.map((img) => (
            <span key={img.id} className="w-2 h-2 rounded-full bg-white/70" />
          ))}
        </div>
      )}
    </div>
  );
}
