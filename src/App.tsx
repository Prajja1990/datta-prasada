import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Layouts
import { CustomerLayout } from './components/common/CustomerLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { MenuPage } from './pages/customer/MenuPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { OrderConfirmationPage } from './pages/customer/OrderConfirmationPage';
import { TrackOrderPage } from './pages/customer/TrackOrderPage';

// Staff & Kitchen Pages
import { StaffLoginPage } from './pages/staff/StaffLoginPage';
import { StaffOrdersPage } from './pages/staff/StaffOrdersPage';
import { KitchenDisplayPage } from './pages/kitchen/KitchenDisplayPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminMenuPage } from './pages/admin/AdminMenuPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* Customer Storefront Routes */}
                <Route element={<CustomerLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order/:orderId" element={<OrderConfirmationPage />} />
                  <Route path="/track" element={<TrackOrderPage />} />
                  <Route path="/track/:token" element={<TrackOrderPage />} />
                  <Route path="/staff/login" element={<StaffLoginPage />} />
                  <Route path="/admin/login" element={<Navigate to="/staff/login" replace />} />
                </Route>

                {/* Staff Orders Portal */}
                <Route
                  path="/staff/orders"
                  element={
                    <ProtectedRoute permission="orders.view_all">
                      <CustomerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<StaffOrdersPage />} />
                </Route>

                {/* Kitchen Display System (Full screen tablet / monitor) */}
                <Route
                  path="/kitchen"
                  element={
                    <ProtectedRoute permission="orders.prepare">
                      <KitchenDisplayPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Management Dashboard Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute permission="dashboard.view">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route
                    path="orders"
                    element={
                      <ProtectedRoute permission="orders.view_all">
                        <StaffOrdersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="menu"
                    element={
                      <ProtectedRoute permission="menu.update">
                        <AdminMenuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="categories"
                    element={
                      <ProtectedRoute permission="menu.update">
                        <AdminCategoriesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <ProtectedRoute permission="reports.view">
                        <AdminReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="audit-logs"
                    element={
                      <ProtectedRoute permission="audit_logs.view">
                        <AdminAuditLogsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <ProtectedRoute permission="roles.manage">
                        <AdminUsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute permission="settings.manage">
                        <AdminSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
