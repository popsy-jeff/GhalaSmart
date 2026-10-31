import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { DepositsPage } from './pages/DepositsPage';
import { FinancingPage } from './pages/FinancingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DepositModal } from './components/modals/DepositModal';

const AppLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const navigate = useNavigate();

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('ghalasmart_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkTheme) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('ghalasmart_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('ghalasmart_theme', 'light');
    }
  }, [isDarkTheme]);

  return (
    <div className="app-layout">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="main-content-wrapper">
        <Navbar
          onOpenDepositModal={() => setIsDepositModalOpen(true)}
          isDarkTheme={isDarkTheme}
          onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
        />

        <main className="main-area">
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            />
            <Route
              path="/register"
              element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
            />

            {/* Protected Core Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deposits"
              element={
                <ProtectedRoute>
                  <DepositsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financing"
              element={
                <ProtectedRoute>
                  <FinancingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback Redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Quick Deposit Modal */}
      {isAuthenticated && (
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          defaultCounty={user?.county || 'Uasin-Gishu'}
          onDepositCreated={() => {
            navigate('/deposits');
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
