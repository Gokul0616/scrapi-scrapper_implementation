import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toaster';
import { ErrorDisplayContainer } from './components/ErrorDisplay';
import Sidebar from './components/Sidebar';
import ApifySidebar from './components/ApifySidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Actors from './pages/Actors';
import ActorDetail from './pages/ActorDetail';
import Runs from './pages/Runs';
import Dataset from './pages/Dataset';
import DatasetV2 from './pages/DatasetV2';
import RunsV2 from './pages/RunsV2';
import RunsV3 from './pages/RunsV3';
import ActorsV2 from './pages/ActorsV2';
import Marketplace from './pages/Marketplace';
import ActorCodeEditor from './pages/ActorCodeEditor';
import Home from './pages/Home';
import Store from './pages/Store';
import Schedules from './pages/Schedules';
import ApiAccess from './pages/ApiAccess';
import GlobalChat from './components/GlobalChat';

// Component to handle root redirect based on last path
const RootRedirect = () => {
  const { lastPath } = useAuth();
  const redirectTo = lastPath || '/home';
  return <Navigate to={redirectTo} replace />;
};

// Component to track route changes and update last path
const RouteTracker = () => {
  const location = useLocation();
  const { updateLastPath, user } = useAuth();

  useEffect(() => {
    // Only track authenticated routes (not login/register)
    if (user && location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
      updateLastPath(location.pathname);
    }
  }, [location.pathname, user, updateLastPath]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Scrapi Logo" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const DashboardLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <ApifySidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      <GlobalChat />
    </div>
  );
};

function AppRoutes() {
  return (
    <>
      <RouteTracker />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RootRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/actors"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ActorsV2 />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/actor/:actorId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ActorDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RunsV3 />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dataset/:runId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DatasetV2 />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/run/:runId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Runs />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Marketplace Route */}
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Marketplace />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/actor-code-editor"
          element={
            <ProtectedRoute>
              <ActorCodeEditor />
            </ProtectedRoute>
          }
        />
        {/* Placeholder routes */}
        <Route path="/home" element={<ProtectedRoute><DashboardLayout><Home /></DashboardLayout></ProtectedRoute>} />
        <Route path="/store" element={<ProtectedRoute><DashboardLayout><Store /></DashboardLayout></ProtectedRoute>} />
        <Route path="/development" element={<ProtectedRoute><DashboardLayout><div className="p-8">Development</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><DashboardLayout><div className="p-8">Saved Tasks</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/integrations" element={<ProtectedRoute><DashboardLayout><div className="p-8">Integrations</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/schedules" element={<ProtectedRoute><DashboardLayout><Schedules /></DashboardLayout></ProtectedRoute>} />
        <Route path="/access-keys" element={<ProtectedRoute><DashboardLayout><ApiAccess /></DashboardLayout></ProtectedRoute>} />
        <Route path="/storage" element={<ProtectedRoute><DashboardLayout><div className="p-8">Storage</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/proxy" element={<ProtectedRoute><DashboardLayout><div className="p-8">Proxy</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><div className="p-8">Settings</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><DashboardLayout><div className="p-8">Billing</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/docs" element={<ProtectedRoute><DashboardLayout><div className="p-8">Documentation</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><DashboardLayout><div className="p-8">Help</div></DashboardLayout></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
          <ErrorDisplayContainer />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
