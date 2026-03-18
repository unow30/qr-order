import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSessionStore } from '@web/stores/sessionStore';
import EntryPage from '@web/pages/EntryPage';
import MenuPage from '@web/pages/MenuPage';
import MenuDetailPage from '@web/pages/MenuDetailPage';
import CartPage from '@web/pages/CartPage';
import OrderHistoryPage from '@web/pages/OrderHistoryPage';
import OrderStatusPage from '@web/pages/OrderStatusPage';
import DevPage from '@web/pages/DevPage';

function RequireSession({ children }: { children: React.ReactNode }) {
  const isSessionValid = useSessionStore((s) => s.isSessionValid);
  if (!isSessionValid()) {
    return <Navigate to="/entry" replace />;
  }
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dev" element={<DevPage />} />
        <Route path="/entry" element={<EntryPage />} />
        <Route path="/" element={<Navigate to="/dev" replace />} />
        <Route
          path="/menu"
          element={<RequireSession><MenuPage /></RequireSession>}
        />
        <Route
          path="/menu/:id"
          element={<RequireSession><MenuDetailPage /></RequireSession>}
        />
        <Route
          path="/cart"
          element={<RequireSession><CartPage /></RequireSession>}
        />
        <Route
          path="/order-history"
          element={<RequireSession><OrderHistoryPage /></RequireSession>}
        />
        <Route
          path="/order-status/:id"
          element={<RequireSession><OrderStatusPage /></RequireSession>}
        />
      </Routes>
    </BrowserRouter>
  );
}
