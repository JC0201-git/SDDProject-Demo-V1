import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from './store/authStore';
import { logout } from './services/api/auth';

const LoginPage = React.lazy(() => import('./pages/LoginPage/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage/DashboardPage'));
const DeviceDetailPage = React.lazy(() => import('./pages/DeviceDetailPage/DeviceDetailPage'));

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 檢查 Session 是否過期（8 小時閒置時間）
 */
const isSessionExpired = (sessionExpiresAt: string | undefined): boolean => {
  if (!sessionExpiresAt) return true;
  
  const expiryTime = new Date(sessionExpiresAt).getTime();
  const now = new Date().getTime();
  
  return now >= expiryTime;
};

/**
 * 受保護路由元件
 * T064: 實作受保護路由與 Session 管理
 * - 未登入時重新導向至 /login
 * - Session 過期檢查：8 小時無 API 請求或使用者互動時自動登出
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, clearUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // 檢查 Session 是否過期
    if (isAuthenticated && user?.sessionExpiresAt) {
      if (isSessionExpired(user.sessionExpiresAt)) {
        handleSessionExpired();
      }
    }
  }, [isAuthenticated, user]);

  const handleSessionExpired = async () => {
    message.warning('登入已過期，請重新登入');
    
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    clearUser();
    navigate('/login', { replace: true });
  };

  // 未登入，導向登入頁
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Session 已過期，導向登入頁
  if (user?.sessionExpiresAt && isSessionExpired(user.sessionExpiresAt)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices/:id"
        element={
          <ProtectedRoute>
            <DeviceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
