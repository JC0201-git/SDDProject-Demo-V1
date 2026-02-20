// ============================================================================
// 服務層：Notification（通知管理）
// ============================================================================
// 包含產生異常通知、設備離線通知、標記已讀等邏輯
// ============================================================================

import { PrismaClient, NotificationEventType, NotificationSeverity } from '@prisma/client';
import { NotificationModel, NotificationListItem, formatUnreadCount } from '../models/notification';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 通知生成選項
 */
export interface CreateNotificationOptions {
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  deviceId: number;
  title: string;
  description: string;
  occurredAt?: Date;
}

/**
 * 通知查詢選項
 */
export interface QueryNotificationsOptions {
  isRead?: boolean;
  deviceId?: number;
  severity?: NotificationSeverity;
  limit?: number;
  offset?: number;
}

/**
 * 通知服務
 */
export class NotificationService {
  /**
   * 產生通知
   */
  async createNotification(options: CreateNotificationOptions): Promise<NotificationModel> {
    try {
      const notification = await prisma.notification.create({
        data: {
          eventType: options.eventType,
          severity: options.severity,
          deviceId: options.deviceId,
          title: options.title,
          description: options.description,
          occurredAt: options.occurredAt || new Date(),
        },
      });

      logger.info(`Notification created: ${notification.title} (ID: ${notification.id})`);
      return notification as NotificationModel;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * 產生異常通知（參數超過閾值）
   */
  async createAbnormalNotification(
    deviceId: number,
    deviceName: string,
    parameter: string,
    value: number,
    unit: string,
    threshold: number,
    severity: NotificationSeverity
  ): Promise<NotificationModel> {
    const eventType = parameter.includes('TEMPERATURE') 
      ? 'TEMPERATURE_ABNORMAL' 
      : parameter.includes('PRESSURE')
      ? 'PRESSURE_ABNORMAL'
      : 'OTHER_ABNORMAL';

    return this.createNotification({
      eventType,
      severity,
      deviceId,
      title: `${parameter}異常`,
      description: `${deviceName} 的 ${parameter} 達到 ${value} ${unit}，超過安全閾值 ${threshold} ${unit}`,
    });
  }

  /**
   * 產生設備離線通知
   */
  async createOfflineNotification(
    deviceId: number,
    deviceName: string
  ): Promise<NotificationModel> {
    return this.createNotification({
      eventType: 'DEVICE_OFFLINE',
      severity: 'ERROR',
      deviceId,
      title: '設備離線',
      description: `${deviceName} 已超過 30 秒未回報資料，判定為離線`,
    });
  }

  /**
   * 產生零件故障通知
   */
  async createComponentFailureNotification(
    deviceId: number,
    deviceName: string,
    componentName: string
  ): Promise<NotificationModel> {
    return this.createNotification({
      eventType: 'COMPONENT_FAILURE',
      severity: 'ERROR',
      deviceId,
      title: '零件異常',
      description: `${deviceName} 的 ${componentName} 發生異常`,
    });
  }

  /**
   * 查詢通知清單
   */
  async getNotifications(options: QueryNotificationsOptions = {}): Promise<{
    notifications: NotificationListItem[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      isRead,
      deviceId,
      severity,
      limit = 50,
      offset = 0,
    } = options;

    try {
      // 建立查詢條件
      const where: any = {};
      if (isRead !== undefined) where.isRead = isRead;
      if (deviceId !== undefined) where.deviceId = deviceId;
      if (severity !== undefined) where.severity = severity;

      // 查詢總數
      const total = await prisma.notification.count({ where });

      // 查詢通知清單（含設備名稱）
      const notifications = await prisma.notification.findMany({
        where,
        include: {
          device: {
            select: {
              deviceName: true,
            },
          },
        },
        orderBy: {
          occurredAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      const notificationList: NotificationListItem[] = notifications.map((n) => ({
        id: n.id,
        eventType: n.eventType,
        severity: n.severity,
        deviceId: n.deviceId,
        deviceName: n.device.deviceName,
        title: n.title,
        description: n.description,
        occurredAt: n.occurredAt,
        isRead: n.isRead,
        readAt: n.readAt,
      }));

      const hasMore = offset + limit < total;

      return {
        notifications: notificationList,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to query notifications:', error);
      throw error;
    }
  }

  /**
   * 標記通知為已讀
   */
  async markAsRead(notificationId: number): Promise<NotificationModel | null> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return null;
      }

      // 如果已經是已讀狀態，直接返回
      if (notification.isRead) {
        return notification as NotificationModel;
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info(`Notification marked as read: ${notificationId}`);
      return updated as NotificationModel;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * 標記所有通知為已讀
   */
  async markAllAsRead(): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: { isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info(`Marked ${result.count} notifications as read`);
      return result.count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * 取得未讀通知數量
   */
  async getUnreadCount(): Promise<{ count: number; displayCount: string }> {
    try {
      const count = await prisma.notification.count({
        where: { isRead: false },
      });

      return {
        count,
        displayCount: formatUnreadCount(count),
      };
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      throw error;
    }
  }
}

// 單例模式
export const notificationService = new NotificationService();
