// ============================================================================
// 容器元件：DashboardPage（儀表板頁面）
// ============================================================================
// 使用 React Query 獲取設備清單與總覽資料
// 整合 DashboardLayout、GlobalSummary、DeviceList、NotificationCenter
// ============================================================================

import React from 'react';
import { Spin, Alert, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/templates/DashboardLayout';
import GlobalSummary from '../../components/organisms/GlobalSummary';
import DeviceList from '../../components/organisms/DeviceList';
import { getDevices } from '../../services/api/devices';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
    refetchInterval: 30000, // 每 30 秒自動重新獲取（降級輪詢機制）
  });

  // 處理錯誤
  if (isError) {
    return (
      <DashboardLayout>
        <div className="dashboard-error">
          <Alert
            message="載入失敗"
            description={(error as Error)?.message || '無法載入設備資料，請稍後再試'}
            type="error"
            showIcon
            action={
              <button onClick={() => refetch()}>重試</button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  // Loading skeleton
  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="dashboard-loading">
          <GlobalSummary
            summary={{
              totalDevices: 0,
              onlineDevices: 0,
              normalDevices: 0,
              abnormalDevices: 0,
              offlineDevices: 0,
              totalPowerConsumption: 0,
              totalHeatOutput: 0,
              averageCOP: 0,
            }}
            loading
          />
          <Spin size="large" tip="載入中..." />
        </div>
      </DashboardLayout>
    );
  }

  // Empty state
  if (data.devices.length === 0) {
    return (
      <DashboardLayout>
        <GlobalSummary summary={data.summary} />
        <div className="dashboard-empty">
          <Empty description="目前系統中沒有設備" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <GlobalSummary summary={data.summary} />
        <DeviceList devices={data.devices} />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
