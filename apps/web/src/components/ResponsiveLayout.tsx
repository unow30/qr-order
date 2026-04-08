import { useLocation } from 'react-router-dom';
import { useSessionStore } from '@web/stores/sessionStore';
import StoreImagesPanel from './StoreImagesPanel';

interface Props {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: Props) {
  const storeId = useSessionStore((s) => s.storeId);
  const { pathname } = useLocation();

  const showPanel = storeId && pathname !== '/store';

  return (
    <div className="flex min-h-screen">
      <div className={`w-full md:border-r md:border-gray-200 ${showPanel ? 'md:w-[60%]' : 'md:w-120 md:shrink-0'}`}>
        {children}
      </div>
      {showPanel && <StoreImagesPanel storeId={storeId} />}
    </div>
  );
}
