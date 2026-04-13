import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { MessageProvider, useMessage } from './contexts/MessageContext';


import GlobalModals from './components/GlobalModals';
import LoadingScreen from './components/LoadingScreen';
import { setupAxiosInterceptor } from './utils/axiosInterceptor';
import { isValidSidebarPath } from './utils/routeUtils';
import Sidebar from './components/Sidebar';
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
import MiraChat from './pages/Chat';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Billing from './pages/Billing';
import CreateOrganizationModal from './components/CreateOrganizationModal';
import UpgradeCheckout from './pages/UpgradeCheckout';
import PaymentSuccess from './pages/checkout/PaymentSuccess';
import InvoiceDetail from './pages/InvoiceDetail';
import AuthCallback from './pages/AuthCallback';

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
  const navigate = useNavigate();
  const { showMessage } = useMessage();

  // Setup axios interceptor once
  useEffect(() => {
    setupAxiosInterceptor(navigate, showMessage);
  }, [navigate]);
  useEffect(() => {
    // Only track authenticated routes that match the sidebar whitelist
    if (user && isValidSidebarPath(location.pathname)) {
      updateLastPath(location.pathname);
    }
  }, [location.pathname, user, updateLastPath]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#0F1014]">
        <LoadingScreen text='Loading...!' />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const DashboardLayout = ({ children }) => {
  const { theme } = useTheme();

  useEffect(() => {
    document.title = 'Scrapi Console';
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-y-auto transition-colors ${theme === 'dark' ? 'bg-[#0F1014]' : 'bg-gray-50'}`}>{children}</main>
      {/* <GlobalChat /> */}
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
        <Route path="/auth/callback" element={<AuthCallback />} />
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
        <Route path="/chat" element={<ProtectedRoute><DashboardLayout><MiraChat /></DashboardLayout></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><DashboardLayout><MiraChat /></DashboardLayout></ProtectedRoute>} />
        <Route path="/store" element={<ProtectedRoute><DashboardLayout><Store /></DashboardLayout></ProtectedRoute>} />
        <Route path="/development" element={<ProtectedRoute><DashboardLayout><div className="p-8">Development</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><DashboardLayout><div className="p-8">Saved Tasks</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/integrations" element={<ProtectedRoute><DashboardLayout><div className="p-8">Integrations</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/schedules" element={<ProtectedRoute><DashboardLayout><Schedules /></DashboardLayout></ProtectedRoute>} />
        <Route path="/access-keys" element={<ProtectedRoute><DashboardLayout><ApiAccess /></DashboardLayout></ProtectedRoute>} />
        <Route path="/storage" element={<ProtectedRoute><DashboardLayout><div className="p-8">Storage</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/proxy" element={<ProtectedRoute><DashboardLayout><div className="p-8">Proxy</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><DashboardLayout><Billing /></DashboardLayout></ProtectedRoute>} />
        <Route path="/billing/invoices/:invoiceId" element={<ProtectedRoute><DashboardLayout><InvoiceDetail /></DashboardLayout></ProtectedRoute>} />
        <Route path="/docs" element={<ProtectedRoute><DashboardLayout><div className="p-8">Documentation</div></DashboardLayout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><DashboardLayout><div className="p-8">Help</div></DashboardLayout></ProtectedRoute>} />

        {/* Explicit Not Found Route */}
        <Route path="/not-found" element={<DashboardLayout><NotFound /></DashboardLayout>} />

        <Route path="/upgrade-checkout" element={<ProtectedRoute><UpgradeCheckout /></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

        {/* 404 Catch-all Route - Must be last */}
        <Route path="*" element={<DashboardLayout><NotFound /></DashboardLayout>} />
      </Routes>
    </>
  );
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <MessageProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <NotificationProvider>
                <ModalProvider>
                  <AppRoutes />
                  <GlobalModals />


                </ModalProvider>
              </NotificationProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </MessageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
