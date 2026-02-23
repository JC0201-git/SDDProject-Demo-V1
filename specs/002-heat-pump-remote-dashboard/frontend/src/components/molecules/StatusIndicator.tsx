// ============================================================================
// 分子元件：StatusIndicator（狀態指示器）
// ============================================================================
// 顯示綠/紅/灰燈號與文字說明
// ============================================================================

import React from 'react';
import { Badge } from 'antd';
import './StatusIndicator.css';

export type StatusColor = 'green' | 'red' | 'gray';

export interface StatusIndicatorProps {
  color: StatusColor;
  text?: string;
  size?: 'small' | 'default' | 'large';
}

/**
 * 燈號顏色映射到 Ant Design Badge 狀態
 */
const colorToStatus = (color: StatusColor): 'success' | 'error' | 'default' => {
  switch (color) {
    case 'green':
      return 'success';
    case 'red':
      return 'error';
    case 'gray':
      return 'default';
    default:
      return 'default';
  }
};

/**
 * 燈號文字預設值
 */
const defaultText = (color: StatusColor): string => {
  switch (color) {
    case 'green':
      return '正常';
    case 'red':
      return '異常';
    case 'gray':
      return '離線';
    default:
      return '未知';
  }
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  color, 
  text, 
  size = 'default' 
}) => {
  const displayText = text || defaultText(color);
  const status = colorToStatus(color);

  return (
    <span className={`status-indicator status-indicator-${size}`}>
      <Badge status={status} />
      <span className="status-text">{displayText}</span>
    </span>
  );
};

export default StatusIndicator;
