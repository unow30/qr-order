import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const NAV_ITEMS = [
  { path: '/dashboard', label: '대시보드', icon: '📊' },
  { path: '/orders', label: '주문 관리', icon: '📋' },
  { path: '/menu', label: '메뉴 관리', icon: '🍽️' },
  { path: '/tables', label: '테이블 관리', icon: '🪑' },
  { path: '/qr', label: 'QR 생성', icon: '📱' },
  { path: '/kds', label: '주방 디스플레이', icon: '👨‍🍳' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { username, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          {sidebarOpen ? <h1 style={{ margin: 0, fontSize: 16, whiteSpace: 'nowrap' }}>QR 오더 어드민</h1> : <span>QR</span>}
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map((item) => (
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
        <header style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', background: '#fff' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginRight: 16 }}
          >
            ☰
          </button>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f5f7fa' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
