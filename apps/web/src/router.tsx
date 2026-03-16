import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSessionStore } from './stores/sessionStore';
import EntryPage from './pages/EntryPage';
import MenuPage from './pages/MenuPage';
import MenuDetailPage from './pages/MenuDetailPage';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import OrderStatusPage from './pages/OrderStatusPage';
import DevPage from './pages/DevPage';

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
          path="/payment"
          element={<RequireSession><PaymentPage /></RequireSession>}
        />
        <Route
          path="/order-status/:id"
          element={<RequireSession><OrderStatusPage /></RequireSession>}
        />
      </Routes>
    </BrowserRouter>
  );
}
