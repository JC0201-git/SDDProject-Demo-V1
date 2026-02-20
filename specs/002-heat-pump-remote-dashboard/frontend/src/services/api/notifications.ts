// ============================================================================
// API 服務：Notifications（通知管理）
// ============================================================================
// 實作 getNotifications()、markAsRead()、getUnreadCount() 函式
// ============================================================================

import { apiClient } from './client';
import { ApiResponse, GetNotificationsParams } from '../../types/api';
import { Notification } from '../../types/models';

/**
 * 通知清單回應
 */
export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * 未讀通知數量回應
 */
export interface UnreadCountResponse {
  unreadCount: number;
  displayCount: string;
}

/**
 * 取得通知清單
 */
export async function getNotifications(params?: GetNotificationsParams): Promise<NotificationsResponse> {
  const response = await apiClient.get<ApiResponse<NotificationsResponse>>('/api/notifications', {
    params,
  });
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || '取得通知清單失敗');
  }
  
  return response.data.data;
}

/**
 * 標記通知為已讀
 */
export async function markAsRead(notificationId: number): Promise<void> {
  const response = await apiClient.patch<ApiResponse>(
    `/api/notifications/${notificationId}/read`
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '標記已讀失敗');
  }
}

/**
 * 標記所有通知為已讀
 */
export async function markAllAsRead(): Promise<void> {
  const response = await apiClient.patch<ApiResponse>('/api/notifications/read-all');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '標記所有通知已讀失敗');
  }
}

/**
 * 取得未讀通知數量
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiClient.get<ApiResponse<UnreadCountResponse>>(
    '/api/notifications/unread-count'
  );
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || '取得未讀通知數量失敗');
  }
  
  return response.data.data;
}
