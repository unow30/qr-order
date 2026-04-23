import { useLocation } from 'react-router-dom';
import { useSessionStore } from '@web/stores/sessionStore';
import StoreImagesPanel from './StoreImagesPanel';

interface Props {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: Props) {
  const storeId = useSessionStore((s) => s.storeId);
  const { pathname } = useLocation();

  const PANEL_PATHS = ['/menu', '/cart', '/order-history', '/order-status', '/payment-complete'];
  const showPanel = Boolean(storeId) && PANEL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* 앱 영역: 배너 있을 때 40%, 없을 때 중앙 정렬 + 최대폭 제한 */}
      <div
        className={
          showPanel
            ? 'w-full md:w-[40%] md:border-r md:border-zinc-200 bg-white h-full overflow-y-auto'
            : 'w-full md:max-w-[440px] md:mx-auto md:border-x md:border-zinc-200 bg-white h-full overflow-y-auto'
        }
      >
        {children}
      </div>
      {showPanel && storeId && <StoreImagesPanel storeId={storeId} />}
    </div>
  );
}
