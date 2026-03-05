import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { ActorsPage } from './pages/Actors';
import { RunsPage } from './pages/Runs';
import { SettingsPage } from './pages/Settings';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { ThemeProvider } from './context/ThemeContext';
import { RoleSelection } from './pages/RoleSelection';
import { TeamPage } from './pages/TeamPage';
import { TerminalPage } from './pages/TerminalPage';
import { PoliciesPage } from './pages/Policies';
import { ApiDocsPage } from './pages/ApiDocs';
import { AuditLogs } from './pages/AuditLogs';
import { PromosPage } from './pages/Promos';
import { NotFound } from './pages/NotFound';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, pendingRoleSelection } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (pendingRoleSelection) {
    return <Navigate to="/select-role" replace />;
  }

  return <>{children}</>;
};

/*
const PublicRoute = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};
*/

const RoleSelectionRoute = () => {
  const { isAuthenticated, pendingRoleSelection } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!pendingRoleSelection) {
    return <Navigate to="/dashboard" replace />;
  }

  return <RoleSelection />;
};

const PermissionRoute: React.FC<{
  children: React.ReactNode,
  requiredRole?: 'owner' | 'admin',
  requiredPermission?: string
}> = ({ children, requiredRole, requiredPermission }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && user.role !== 'owner' && !(user.permissions || []).includes(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AlertProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/select-role" element={<RoleSelectionRoute />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="actors" element={<ActorsPage />} />
                <Route path="runs" element={<RunsPage />} />
                <Route path="policies" element={<PoliciesPage />} />
                <Route path="documentation" element={<ApiDocsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="promos" element={<PromosPage />} />
                <Route path="team" element={<PermissionRoute requiredRole="owner"><TeamPage /></PermissionRoute>} />
                <Route path="terminal" element={
                  <PermissionRoute requiredPermission="terminal_access">
                    <TerminalPage />
                  </PermissionRoute>
                } />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </AlertProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
