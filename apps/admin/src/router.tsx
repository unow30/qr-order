import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@admin/stores/authStore';
import AdminLayout from '@admin/components/layout/AdminLayout';
import LoginPage from '@admin/pages/LoginPage';
import DashboardPage from '@admin/pages/DashboardPage';
import OrderManagePage from '@admin/pages/OrderManagePage';
import MenuManagePage from '@admin/pages/MenuManagePage';
import TableManagePage from '@admin/pages/TableManagePage';
import QRGeneratePage from '@admin/pages/QRGeneratePage';
import KDSPage from '@admin/pages/KDSPage';
import StoreManagePage from '@admin/pages/StoreManagePage';
import ReportPage from '@admin/pages/ReportPage';
import CouponManagePage from '@admin/pages/CouponManagePage';
import ReviewManagePage from '@admin/pages/ReviewManagePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const hasSuperAdminAccess = useAuthStore((s) => s.hasSuperAdminAccess);
  if (!hasSuperAdminAccess()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function AdminRouter() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrderManagePage />} />
          <Route path="menu" element={<MenuManagePage />} />
          <Route path="tables" element={<TableManagePage />} />
          <Route path="qr" element={<QRGeneratePage />} />
          <Route path="kds" element={<KDSPage />} />
          <Route
            path="stores"
            element={
              <SuperAdminRoute>
                <StoreManagePage />
              </SuperAdminRoute>
            }
          />
          <Route path="reports" element={<ReportPage />} />
          <Route path="coupons" element={<CouponManagePage />} />
          <Route path="reviews" element={<ReviewManagePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
