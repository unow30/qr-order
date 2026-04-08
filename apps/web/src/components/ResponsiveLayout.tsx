import { useSessionStore } from '@web/stores/sessionStore';
import StoreImagesPanel from './StoreImagesPanel';

interface Props {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: Props) {
  const storeId = useSessionStore((s) => s.storeId);

  return (
    <div className="flex min-h-screen">
      <div className="w-full md:w-120 md:shrink-0 md:border-r md:border-gray-200">
        {children}
      </div>
      {storeId && <StoreImagesPanel storeId={storeId} />}
    </div>
  );
}
