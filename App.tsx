import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { Login } from './pages/Login';
import { ClientDashboard } from './pages/client/ClientViews';
import { AdminDashboard } from './pages/admin/AdminViews';
import { Role } from './types';

const AppRoutes: React.FC = () => {
  const { user } = useApp();

  if (!user) {
    return <Login />;
  }

  return (
      <Routes>
        <Route path="/" element={
            user.role === Role.ADMIN ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />
        } />
        <Route path="/client" element={user.role === Role.CLIENT ? <ClientDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin" element={user.role === Role.ADMIN ? <AdminDashboard /> : <Navigate to="/" replace />} />
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