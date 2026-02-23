// ============================================================================
// 分子元件：NotificationItem（通知項目）
// ============================================================================
// 顯示事件類型、時間、描述、已讀標記
// ============================================================================

import React from 'react';
import { Badge, Tag } from 'antd';
import { 
  WarningOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined,
  DisconnectOutlined 
} from '@ant-design/icons';
import './NotificationItem.css';

export interface NotificationItemProps {
  notificationId: number;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  deviceName: string | null;
  title: string;
  description: string;
  occurredAt: string;
  isRead: boolean;
  onClick?: () => void;
}

/**
 * 取得事件類型圖示
 */
const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'DEVICE_OFFLINE':
      return <DisconnectOutlined />;
    case 'TEMPERATURE_ABNORMAL':
    case 'PRESSURE_ABNORMAL':
      return <WarningOutlined />;
    case 'COMPONENT_FAILURE':
      return <CloseCircleOutlined />;
    default:
      return <InfoCircleOutlined />;
  }
};

/**
 * 取得嚴重程度顏色
 */
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'ERROR':
      return 'red';
    case 'WARNING':
      return 'orange';
    case 'INFO':
      return 'blue';
    default:
      return 'default';
  }
};

/**
 * 格式化時間
 */
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return '剛剛';
  } else if (diffMins < 60) {
    return `${diffMins} 分鐘前`;
  } else if (diffHours < 24) {
    return `${diffHours} 小時前`;
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-TW');
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  eventType,
  severity,
  deviceName,
  title,
  description,
  occurredAt,
  isRead,
  onClick,
}) => {
  return (
    <div 
      className={`notification-item ${!isRead ? 'notification-unread' : ''}`}
      onClick={onClick}
    >
      <div className="notification-icon">
        {getEventIcon(eventType)}
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-title">{title}</span>
          <Tag color={getSeverityColor(severity)} className="notification-severity">
            {severity === 'ERROR' ? '錯誤' : severity === 'WARNING' ? '警告' : '資訊'}
          </Tag>
        </div>
        
        {deviceName && (
          <div className="notification-device">
            設備：{deviceName}
          </div>
        )}
        
        <div className="notification-description">
          {description}
        </div>
        
        <div className="notification-time">
          {formatTime(occurredAt)}
        </div>
      </div>
      
      {!isRead && (
        <Badge dot className="notification-badge" />
      )}
    </div>
  );
};

export default NotificationItem;
