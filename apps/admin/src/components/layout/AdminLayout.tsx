import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@admin/stores/authStore';
import { getStores, Store } from '@admin/api/store.api';

const STORE_ADMIN_NAV = [
  { path: '/dashboard', label: '대시보드', icon: '📊' },
  { path: '/orders', label: '주문 관리', icon: '📋' },
  { path: '/menu', label: '메뉴 관리', icon: '🍽️' },
  { path: '/tables', label: '테이블 관리', icon: '🪑' },
  { path: '/qr', label: 'QR 생성', icon: '📱' },
  { path: '/kds', label: '주방 디스플레이', icon: '👨‍🍳' },
  { path: '/coupons', label: '쿠폰 관리', icon: '🏷️' },
  { path: '/reviews', label: '리뷰 관리', icon: '⭐' },
  { path: '/reports', label: '리포트', icon: '📈' },
];

const SUPER_ADMIN_NAV = [
  { path: '/stores', label: '매장 관리', icon: '🏪' },
  { path: '/reports', label: '통합 리포트', icon: '📈' },
  { path: '/dashboard', label: '대시보드', icon: '📊' },
  { path: '/orders', label: '주문 관리', icon: '📋' },
  { path: '/menu', label: '메뉴 관리', icon: '🍽️' },
  { path: '/tables', label: '테이블 관리', icon: '🪑' },
  { path: '/qr', label: 'QR 생성', icon: '📱' },
  { path: '/kds', label: '주방 디스플레이', icon: '👨‍🍳' },
  { path: '/coupons', label: '쿠폰 관리', icon: '🏷️' },
  { path: '/reviews', label: '리뷰 관리', icon: '⭐' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { username, role, storeIds, currentStoreId, setCurrentStoreId, clearAuth } = useAuthStore();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isReadOnly = role === 'SUPER_ADMIN_READONLY';
  const hasSuperAdminAccess = isSuperAdmin || isReadOnly;
  const isMultiStoreAdmin = role === 'STORE_ADMIN' && storeIds.length > 1;
  const showStoreSwitcher = hasSuperAdminAccess || isMultiStoreAdmin;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  const navItems = hasSuperAdminAccess ? SUPER_ADMIN_NAV : STORE_ADMIN_NAV;
  const currentStore = stores.find((s) => s.id === currentStoreId);

  useEffect(() => {
    if (hasSuperAdminAccess) {
      getStores().then(setStores).catch(() => {});
    } else if (isMultiStoreAdmin) {
      getStores()
        .then((all) => setStores(all.filter((s) => storeIds.includes(s.id))))
        .catch(() => {});
    }
  }, [hasSuperAdminAccess, isMultiStoreAdmin]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex h-screen font-sans">
      {/* Sidebar */}
      <aside
        className="bg-[#1a1a2e] text-white flex flex-col overflow-hidden transition-[width] duration-200"
        style={{ width: sidebarOpen ? 220 : 60 }}
      >
        <div className="px-4 py-5 border-b border-white/10">
          {sidebarOpen ? (
            <div>
              <h1 className="m-0 text-base whitespace-nowrap">QR 오더 어드민</h1>
              {isSuperAdmin && (
                <span className="text-[10px] text-brand bg-[rgba(255,107,53,0.2)] px-1.5 py-0.5 rounded mt-1 inline-block">
                  슈퍼 어드민
                </span>
              )}
              {isReadOnly && (
                <span className="text-[10px] text-blue-300 bg-[rgba(59,130,246,0.2)] px-1.5 py-0.5 rounded mt-1 inline-block">
                  읽기 전용
                </span>
              )}
            </div>
          ) : <span className="text-[13px]">QR</span>}
        </div>
        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 no-underline border-r-[3px] ${
                  isActive
                    ? 'text-brand bg-[rgba(255,107,53,0.1)] border-brand'
                    : 'text-gray-300 bg-transparent border-transparent'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          {sidebarOpen && <p className="mb-2 text-xs text-gray-500">{username}</p>}
          <button
            onClick={handleLogout}
            className="bg-transparent border border-gray-600 text-gray-300 px-3 py-1.5 rounded-md cursor-pointer w-full"
          >
            {sidebarOpen ? '로그아웃' : '↩'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="px-6 h-14 flex items-center border-b border-gray-200 bg-white gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-transparent border-none text-xl cursor-pointer"
          >
            ☰
          </button>

          {/* 매장 선택기 */}
          {showStoreSwitcher ? (
            <div className="relative">
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg cursor-pointer text-[13px] text-gray-700 ${currentStore ? 'bg-orange-50' : 'bg-gray-50'}`}
              >
                <span>🏪</span>
                <span>{currentStore ? currentStore.name : '매장 선택'}</span>
                <span className="text-[10px]">▼</span>
              </button>
              {storeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-100 min-w-50">
                  {hasSuperAdminAccess && (
                    <button
                      onClick={() => { setCurrentStoreId(null); setStoreDropdownOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left border-none cursor-pointer text-[13px] text-gray-500 ${!currentStoreId ? 'bg-orange-50' : 'bg-transparent'}`}
                    >
                      전체 보기
                    </button>
                  )}
                  {stores.filter((s) => s.isActive).map((store) => (
                    <button
                      key={store.id}
                      onClick={() => { setCurrentStoreId(store.id); setStoreDropdownOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left border-none border-t border-t-gray-50 cursor-pointer text-[13px] text-gray-700 ${currentStoreId === store.id ? 'bg-orange-50' : 'bg-transparent'}`}
                    >
                      {store.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : currentStore ? (
            <span className="px-2.5 py-1 bg-orange-50 rounded-md text-[13px] text-brand font-semibold">
              🏪 {currentStore.name}
            </span>
          ) : null}
        </header>

        <main className="flex-1 overflow-auto p-6 bg-[#f5f7fa]">
          <Outlet />
        </main>
      </div>

      {/* 드롭다운 외부 클릭 닫기 */}
      {storeDropdownOpen && (
        <div
          className="fixed inset-0 z-99"
          onClick={() => setStoreDropdownOpen(false)}
        />
      )}
    </div>
  );
}
