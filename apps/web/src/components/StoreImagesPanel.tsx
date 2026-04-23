import { useEffect, useState } from 'react';
import { EntityImage } from '@qr-order/shared-types';
import { getStoreActiveImages } from '@web/api/image.api';

interface Props {
  storeId: string;
}

export default function StoreImagesPanel({ storeId }: Props) {
  const [images, setImages] = useState<EntityImage[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    getStoreActiveImages(storeId)
      .then(setImages)
      .catch(() => setImages([]));
  }, [storeId]);

  return (
    <div className="hidden md:flex md:w-[60%] bg-zinc-100 overflow-x-hidden relative h-full">
      <div
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth === 0) return;
          setActiveIdx(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-zinc-400 text-sm">매장 이미지 없음</span>
          </div>
        ) : (
          images.map((img) => (
            <div key={img.id} className="snap-center shrink-0 w-full h-full overflow-y-auto">
              <img
                src={img.imageUrl}
                alt={img.altText ?? '매장 이미지'}
                className="w-full h-auto object-cover"
              />
            </div>
          ))
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {images.map((img, i) => (
            <span
              key={img.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
