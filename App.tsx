import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { Login } from './pages/Login';
import { ClientDashboard } from './pages/client/ClientViews';
import { AdminDashboard } from './pages/admin/AdminViews';
import { Role } from './types';

const isAdminUrlRequested = (hashPath: string): boolean => {
  if (hashPath === '/admin' || hashPath.startsWith('/admin/')) return true;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  if (pathname.endsWith('/admin')) return true;
  const params = new URLSearchParams(window.location.search);
  return params.has('admin');
};

const AppRoutes: React.FC = () => {
  const { user } = useApp();
  const location = useLocation();
  const wantsAdmin = isAdminUrlRequested(location.pathname);

  if (!user) {
    return <Login initialView={wantsAdmin ? 'admin' : 'select'} />;
  }

  if (wantsAdmin && user.role !== Role.ADMIN) {
    return <Login initialView="admin" />;
  }

  return (
      <Routes>
        <Route path="/" element={
            user.role === Role.ADMIN ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />
        } />
        <Route path="/client" element={user.role === Role.CLIENT ? <ClientDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin" element={user.role === Role.ADMIN ? <AdminDashboard /> : <Login initialView="admin" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
          <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;