// ============================================================================
// 有機體元件：NotificationCenter（通知中心）
// ============================================================================
// 下拉面板，初始載入最近 50 則通知，支援「載入更多」按鈕增量載入舊通知
// 未讀數量顯示邏輯：≤99 則顯示實際數字，>99 則顯示「99+」
// 支援標記已讀功能，點擊通知項目時自動標記為已讀
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, Spin, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import NotificationItem from '../molecules/NotificationItem';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../../services/api/notifications';
import { Notification } from '../../types/models';
import './NotificationCenter.css';

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayCount, setDisplayCount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const LIMIT = 50;

  // 載入未讀數量
  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadCount();
      setUnreadCount(result.unreadCount);
      setDisplayCount(result.displayCount);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  // 載入通知清單
  const loadNotifications = async (loadMore = false) => {
    setLoading(true);
    try {
      const currentOffset = loadMore ? offset : 0;
      const result = await getNotifications({
        limit: LIMIT,
        offset: currentOffset,
      });

      if (loadMore) {
        setNotifications((prev) => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }

      setHasMore(result.pagination.hasMore);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // 標記通知為已讀
  const handleNotificationClick = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      
      // 更新本地狀態
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      
      // 重新載入未讀數量
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 標記全部已讀
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      
      // 更新本地狀態
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      setDisplayCount('0');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 下拉選單開啟時載入通知
  useEffect(() => {
    if (dropdownOpen) {
      setOffset(0);
      loadNotifications(false);
    }
  }, [dropdownOpen]);

  // 初始載入未讀數量
  useEffect(() => {
    loadUnreadCount();
    
    // 每 30 秒更新一次未讀數量
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const dropdownContent = (
    <div className="notification-dropdown">
      <div className="notification-header">
        <span className="notification-title">通知中心</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead}>
            全部已讀
          </Button>
        )}
      </div>

      <div className="notification-list">
        {loading && notifications.length === 0 ? (
          <div className="notification-loading">
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="目前沒有通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.notificationId}
                notificationId={notification.notificationId}
                eventType={notification.eventType}
                severity={notification.severity}
                deviceName={notification.deviceName}
                title={notification.message}
                description=""
                occurredAt={notification.occurredAt}
                isRead={notification.isRead}
                onClick={() => handleNotificationClick(notification.notificationId)}
              />
            ))}
            
            {hasMore && (
              <div className="notification-load-more">
                <Button
                  type="link"
                  onClick={() => loadNotifications(true)}
                  loading={loading}
                >
                  載入更多
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      overlay={dropdownContent}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
      overlayClassName="notification-center-dropdown"
    >
      <Badge count={displayCount} overflowCount={99}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          className="notification-button"
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;
