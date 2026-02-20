// ============================================================================
// 有機體元件：DeviceList（設備清單）
// ============================================================================
// 渲染多個 DeviceCard，處理點擊導航至詳細頁面
// ============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty } from 'antd';
import DeviceCard from '../molecules/DeviceCard';
import { DeviceSummary } from '../../types/models';
import './DeviceList.css';

export interface DeviceListProps {
  devices: DeviceSummary[];
  loading?: boolean;
}

const DeviceList: React.FC<DeviceListProps> = ({ devices, loading }) => {
  const navigate = useNavigate();

  const handleDeviceClick = (deviceId: number) => {
    navigate(`/devices/${deviceId}`);
  };

  if (!loading && devices.length === 0) {
    return (
      <div className="device-list-empty">
        <Empty description="目前沒有設備資料" />
      </div>
    );
  }

  return (
    <div className="device-list">
      {devices.map((device) => (
        <DeviceCard
          key={device.deviceId}
          deviceId={device.deviceId}
          deviceName={device.deviceName}
          statusLight={device.indicatorColor}
          operationMode={device.operationMode}
          currentCOP={device.cop}
          instantPowerConsumption={device.powerConsumption}
          waterTankTemperature={device.currentTemperature}
          lastDataReceivedAt={device.lastDataReceivedAt}
          onClick={() => handleDeviceClick(device.deviceId)}
        />
      ))}
    </div>
  );
};

export default DeviceList;
