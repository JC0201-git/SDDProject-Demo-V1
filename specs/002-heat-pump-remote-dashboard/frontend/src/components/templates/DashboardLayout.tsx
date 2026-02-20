// ============================================================================
// 模板元件：DashboardLayout（儀表板佈局）
// ============================================================================
// 包含頂部總覽區、左側設備清單、中央內容區、右上角通知圖示
// ============================================================================

import React from 'react';
import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../services/api/auth';
import { useAuthStore } from '../../store/authStore';
import NotificationCenter from '../organisms/NotificationCenter';
import './DashboardLayout.css';

const { Header, Content } = Layout;

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      clearUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Layout className="dashboard-layout">
      <Header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">熱泵遠端監控系統</h1>
        </div>
        
        <div className="dashboard-header-right">
          <span className="user-display-name">
            {user?.displayName || user?.username}
          </span>
          
          <NotificationCenter />
          
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className="logout-button"
          >
            登出
          </Button>
        </div>
      </Header>

      <Content className="dashboard-content">
        {children}
      </Content>
    </Layout>
  );
};

export default DashboardLayout;
