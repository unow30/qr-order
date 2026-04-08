import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSessionStore } from '@web/stores/sessionStore';
import EntryPage from '@web/pages/EntryPage';
import MenuPage from '@web/pages/MenuPage';
import MenuDetailPage from '@web/pages/MenuDetailPage';
import CartPage from '@web/pages/CartPage';
import OrderHistoryPage from '@web/pages/OrderHistoryPage';
import OrderStatusPage from '@web/pages/OrderStatusPage';
import StorePage from '@web/pages/StorePage.tsx';
import PaymentCompletePage from '@web/pages/PaymentCompletePage';

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
        <Route path="/store" element={<StorePage />} />
        <Route path="/entry" element={<EntryPage />} />
        <Route path="/" element={<Navigate to="/store" replace />} />
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
        <Route path="/payment-complete" element={<PaymentCompletePage />} />
      </Routes>
    </BrowserRouter>
  );
}
