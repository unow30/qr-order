import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrderManagePage from './pages/OrderManagePage';
import MenuManagePage from './pages/MenuManagePage';
import TableManagePage from './pages/TableManagePage';
import QRGeneratePage from './pages/QRGeneratePage';
import KDSPage from './pages/KDSPage';
import StoreManagePage from './pages/StoreManagePage';
import ReportPage from './pages/ReportPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  if (!isSuperAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function AdminRouter() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
