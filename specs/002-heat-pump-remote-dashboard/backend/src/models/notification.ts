// ============================================================================
// 模型層：Notification（通知訊息）
// ============================================================================
// 定義通知實體介面
// ============================================================================

import { NotificationEventType, NotificationSeverity } from '@prisma/client';

/**
 * 通知實體介面（對應 Prisma Schema）
 */
export interface NotificationModel {
  id: number;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  deviceId: number;
  title: string;
  description: string;
  occurredAt: Date;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * 通知清單項目（用於前端顯示）
 */
export interface NotificationListItem {
  id: number;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  deviceId: number;
  deviceName?: string;
  title: string;
  description: string;
  occurredAt: Date;
  isRead: boolean;
  readAt: Date | null;
}

/**
 * 通知清單查詢參數
 */
export interface NotificationQueryParams {
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 未讀通知數量回應
 */
export interface UnreadCountResponse {
  count: number;
  displayCount: string; // 實際數字或 "99+"
}

/**
 * 計算未讀通知顯示數量
 * ≤99 則顯示實際數字，>99 則顯示「99+」
 */
export function formatUnreadCount(count: number): string {
  return count > 99 ? '99+' : count.toString();
}
