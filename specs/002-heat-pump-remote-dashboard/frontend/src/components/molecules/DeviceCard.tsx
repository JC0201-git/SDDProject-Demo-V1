// ============================================================================
// 分子元件：DeviceCard（設備卡片）
// ============================================================================
// 展示元件，接收設備資料 props，顯示設備名稱、燈號、即時參數
// ============================================================================

import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import StatusIndicator, { StatusColor } from './StatusIndicator';
import './DeviceCard.css';

export interface DeviceCardProps {
  deviceId: number;
  deviceName: string;
  statusLight: StatusColor;
  operationMode: string;
  currentCOP: number | null;
  instantPowerConsumption: number | null;
  waterTankTemperature: number | null;
  lastDataReceivedAt: string | null;
  onClick?: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  deviceName,
  statusLight,
  operationMode,
  currentCOP,
  instantPowerConsumption,
  waterTankTemperature,
  lastDataReceivedAt,
  onClick,
}) => {
  const formatValue = (value: number | null, unit: string) => {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      className="device-card"
      hoverable={!!onClick}
      onClick={onClick}
    >
      <div className="device-card-header">
        <h3 className="device-name">{deviceName}</h3>
        <StatusIndicator color={statusLight} />
      </div>

      <div className="device-card-mode">
        模式：{operationMode === 'AUTO' ? '自動' : '手動'}
      </div>

      <Row gutter={[16, 8]} className="device-card-stats">
        <Col span={12}>
          <Statistic
            title="COP"
            value={currentCOP !== null ? currentCOP.toFixed(2) : '--'}
            valueStyle={{ fontSize: '18px' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="耗電量"
            value={formatValue(instantPowerConsumption, 'kW')}
            valueStyle={{ fontSize: '18px' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="水箱溫度"
            value={formatValue(waterTankTemperature, '°C')}
            valueStyle={{ fontSize: '18px' }}
          />
        </Col>
        <Col span={12}>
          <div className="last-update">
            <span className="last-update-label">最後更新</span>
            <span className="last-update-time">{formatDateTime(lastDataReceivedAt)}</span>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default DeviceCard;
