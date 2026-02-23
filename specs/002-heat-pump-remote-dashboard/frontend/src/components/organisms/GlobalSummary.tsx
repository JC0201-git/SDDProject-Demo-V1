// ============================================================================
// 有機體元件：GlobalSummary（全域總覽統計）
// ============================================================================
// 顯示在線設備數、總耗電量、總產熱量、整體COP 四個數字卡片
// ============================================================================

import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { 
  DashboardOutlined, 
  ThunderboltOutlined, 
  FireOutlined,
  RiseOutlined 
} from '@ant-design/icons';
import { GlobalSummary as GlobalSummaryType } from '../../types/models';
import './GlobalSummary.css';

export interface GlobalSummaryProps {
  summary: GlobalSummaryType;
  loading?: boolean;
}

const GlobalSummary: React.FC<GlobalSummaryProps> = ({ summary, loading }) => {
  return (
    <div className="global-summary">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="在線設備數"
              value={summary.onlineDevices}
              suffix={`/ ${summary.totalDevices}`}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="總耗電量"
              value={summary.totalPowerConsumption}
              suffix="kW"
              precision={1}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="總產熱量"
              value={summary.totalHeatOutput}
              suffix="kW"
              precision={1}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="整體 COP"
              value={summary.averageCOP || 0}
              precision={2}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GlobalSummary;
