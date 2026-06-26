import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeProvider';
import { RoleProtectedRoute } from './routes/RoleProtectedRoute';
import { getDefaultRouteForRole } from './utils/routeUtils';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import CustomerLayout from './layouts/CustomerLayout';

// Portal Pages
import CustomerDashboard   from './pages/portal/CustomerDashboard';
import CustomerBooking     from './pages/portal/CustomerBooking';
import CustomerAppointments from './pages/portal/CustomerAppointments';
import CustomerProfile     from './pages/portal/CustomerProfile';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import AppointmentsPage from './pages/Appointments';
import StaffPage from './pages/Staff';
import ServicesPage from './pages/Services';
import ResourcesPage from './pages/Resources';
import AnalyticsPage from './pages/Analytics';
import SettingsPage from './pages/Settings';
import NotificationsPage from './pages/Notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
              </Route>

              {/* Protected Routes (Business / Admin) */}
              <Route
                path="/"
                element={
                  <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'BUSINESS_OWNER', 'STAFF']}>
                    <DashboardLayout />
                  </RoleProtectedRoute>
                }
              >
                <Route index element={<RootRedirect />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Placeholder routes – add real pages as they're built */}
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="staff"        element={<StaffPage />} />
                <Route path="services"     element={<ServicesPage />} />
                <Route path="resources"    element={<ResourcesPage />} />
                <Route path="analytics"    element={<AnalyticsPage />} />
                <Route path="settings"     element={<SettingsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />

              {/* ── Customer Portal ── */}
              <Route
                path="/portal"
                element={
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout />
                  </RoleProtectedRoute>
                }
              >
                <Route index              element={<RootRedirect />} />
                <Route path="dashboard"   element={<CustomerDashboard />} />
                <Route path="book"        element={<CustomerBooking />} />
                <Route path="appointments" element={<CustomerAppointments />} />
                <Route path="profile"     element={<CustomerProfile />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

