import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getStores, Store } from '../../api/store.api';

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
  const { username, role, currentStoreId, setCurrentStoreId, clearAuth } = useAuthStore();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV : STORE_ADMIN_NAV;
  const currentStore = stores.find((s) => s.id === currentStoreId);

  useEffect(() => {
    if (isSuperAdmin) {
      getStores().then(setStores).catch(() => {});
    }
  }, [isSuperAdmin]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 220 : 60, transition: 'width 0.2s',
        background: '#1a1a2e', color: '#fff', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {sidebarOpen ? (
            <div>
              <h1 style={{ margin: 0, fontSize: 16, whiteSpace: 'nowrap' }}>QR 오더 어드민</h1>
              {isSuperAdmin && (
                <span style={{ fontSize: 10, color: '#ff6b35', background: 'rgba(255,107,53,0.2)', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                  슈퍼 어드민
                </span>
              )}
            </div>
          ) : <span style={{ fontSize: 13 }}>QR</span>}
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', textDecoration: 'none',
                color: isActive ? '#ff6b35' : '#ccc',
                background: isActive ? 'rgba(255,107,53,0.1)' : 'transparent',
                borderRight: isActive ? '3px solid #ff6b35' : '3px solid transparent',
              })}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {sidebarOpen && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#888' }}>{username}</p>}
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1px solid #555', color: '#ccc', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', width: '100%' }}
          >
            {sidebarOpen ? '로그아웃' : '↩'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TopBar */}
        <header style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', background: '#fff', gap: 16 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
          >
            ☰
          </button>

          {/* 매장 선택기 (SUPER_ADMIN) 또는 현재 매장 뱃지 (STORE_ADMIN) */}
          {isSuperAdmin ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8,
                  background: currentStore ? '#fff3e0' : '#f5f5f5',
                  cursor: 'pointer', fontSize: 13, color: '#333',
                }}
              >
                <span>🏪</span>
                <span>{currentStore ? currentStore.name : '매장 선택'}</span>
                <span style={{ fontSize: 10 }}>▼</span>
              </button>
              {storeDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  background: '#fff', border: '1px solid #eee', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 200,
                }}>
                  <button
                    onClick={() => { setCurrentStoreId(null); setStoreDropdownOpen(false); }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 16px',
                      textAlign: 'left', border: 'none', background: !currentStoreId ? '#fff3e0' : 'transparent',
                      cursor: 'pointer', fontSize: 13, color: '#666',
                    }}
                  >
                    전체 보기
                  </button>
                  {stores.filter((s) => s.isActive).map((store) => (
                    <button
                      key={store.id}
                      onClick={() => { setCurrentStoreId(store.id); setStoreDropdownOpen(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 16px',
                        textAlign: 'left', border: 'none',
                        background: currentStoreId === store.id ? '#fff3e0' : 'transparent',
                        cursor: 'pointer', fontSize: 13, color: '#333',
                        borderTop: '1px solid #f5f5f5',
                      }}
                    >
                      {store.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : currentStore ? (
            <span style={{
              padding: '4px 10px', background: '#fff3e0', borderRadius: 6,
              fontSize: 13, color: '#ff6b35', fontWeight: 600,
            }}>
              🏪 {currentStore.name}
            </span>
          ) : null}
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f5f7fa' }}>
          {/* SUPER_ADMIN이 매장을 선택하지 않았고 stores/ 가 아닌 페이지일 때 안내 */}
          <Outlet />
        </main>
      </div>

      {/* 드롭다운 외부 클릭 닫기 */}
      {storeDropdownOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setStoreDropdownOpen(false)}
        />
      )}
    </div>
  );
}
