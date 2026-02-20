// ============================================================================
// API 路由：Notifications（通知管理）
// ============================================================================
// 實作 GET /api/notifications、PATCH /api/notifications/:id/read、GET /api/notifications/unread-count
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from '../../services/notification';
import { NotificationSeverity } from '@prisma/client';
import { logger } from '../../utils/logger';

/**
 * GET /api/notifications 查詢參數
 */
interface GetNotificationsQuery {
  isRead?: string;
  severity?: NotificationSeverity;
  deviceId?: string;
  limit?: string;
  offset?: string;
}

/**
 * 註冊通知 API 路由
 */
export async function registerNotificationRoutes(server: FastifyInstance) {
  /**
   * GET /api/notifications
   * 取得通知清單
   */
  server.get(
    '/api/notifications',
    {
      preHandler: server.auth,
    },
    async (request: FastifyRequest<{ Querystring: GetNotificationsQuery }>, reply: FastifyReply) => {
      try {
        const { isRead, severity, deviceId, limit, offset } = request.query;

        // 解析查詢參數
        const options: any = {};
        
        if (isRead !== undefined) {
          options.isRead = isRead === 'true';
        }
        
        if (severity) {
          options.severity = severity;
        }
        
        if (deviceId) {
          const parsedDeviceId = parseInt(deviceId, 10);
          if (!isNaN(parsedDeviceId)) {
            options.deviceId = parsedDeviceId;
          }
        }
        
        if (limit) {
          const parsedLimit = parseInt(limit, 10);
          if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
            options.limit = parsedLimit;
          }
        }
        
        if (offset) {
          const parsedOffset = parseInt(offset, 10);
          if (!isNaN(parsedOffset) && parsedOffset >= 0) {
            options.offset = parsedOffset;
          }
        }

        const result = await notificationService.getNotifications(options);

        return reply.code(200).send({
          success: true,
          data: {
            notifications: result.notifications,
            pagination: {
              total: result.total,
              limit: options.limit || 50,
              offset: options.offset || 0,
              hasMore: result.hasMore,
            },
          },
        });
      } catch (error) {
        logger.error('Error in GET /api/notifications:', error);
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '系統發生錯誤，請稍後再試',
          },
        });
      }
    }
  );

  /**
   * GET /api/notifications/unread-count
   * 取得未讀通知數量
   */
  server.get(
    '/api/notifications/unread-count',
    {
      preHandler: server.auth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await notificationService.getUnreadCount();

        return reply.code(200).send({
          success: true,
          data: {
            unreadCount: result.count,
            displayCount: result.displayCount,
          },
        });
      } catch (error) {
        logger.error('Error in GET /api/notifications/unread-count:', error);
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '系統發生錯誤，請稍後再試',
          },
        });
      }
    }
  );

  /**
   * PATCH /api/notifications/:id/read
   * 標記通知為已讀
   */
  server.patch(
    '/api/notifications/:id/read',
    {
      preHandler: server.auth,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const notificationId = parseInt(request.params.id, 10);

        if (isNaN(notificationId)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: '通知 ID 格式錯誤',
            },
          });
        }

        const notification = await notificationService.markAsRead(notificationId);

        if (!notification) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'NOTIFICATION_NOT_FOUND',
              message: '找不到指定的通知',
            },
          });
        }

        return reply.code(200).send({
          success: true,
          message: '通知已標記為已讀',
          data: {
            notificationId: notification.id,
            isRead: notification.isRead,
            readAt: notification.readAt,
          },
        });
      } catch (error) {
        logger.error('Error in PATCH /api/notifications/:id/read:', error);
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '系統發生錯誤，請稍後再試',
          },
        });
      }
    }
  );

  /**
   * PATCH /api/notifications/read-all
   * 標記所有通知為已讀
   */
  server.patch(
    '/api/notifications/read-all',
    {
      preHandler: server.auth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const count = await notificationService.markAllAsRead();

        return reply.code(200).send({
          success: true,
          message: '所有通知已標記為已讀',
          data: {
            updatedCount: count,
          },
        });
      } catch (error) {
        logger.error('Error in PATCH /api/notifications/read-all:', error);
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '系統發生錯誤，請稍後再試',
          },
        });
      }
    }
  );

  logger.info('Notification routes registered');
}
