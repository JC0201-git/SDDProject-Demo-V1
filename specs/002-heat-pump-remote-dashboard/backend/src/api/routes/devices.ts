// ============================================================================
// API 路由：Devices（設備管理）
// ============================================================================
// 實作 GET /api/devices（回傳設備清單與總覽資訊）
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { deviceService } from '../../services/device';
import { logger } from '../../utils/logger';

/**
 * 註冊設備 API 路由
 */
export async function registerDeviceRoutes(server: FastifyInstance) {
  /**
   * GET /api/devices
   * 取得所有設備清單與總覽統計
   */
  server.get(
    '/api/devices',
    {
      preHandler: server.auth, // 需要認證
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await deviceService.getDevicesWithSummary();

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Error in GET /api/devices:', error);
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
   * GET /api/devices/:id
   * 取得單一設備詳細資訊（保留給 User Story 2 使用）
   */
  server.get(
    '/api/devices/:id',
    {
      preHandler: server.auth,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const deviceId = parseInt(request.params.id, 10);

        if (isNaN(deviceId)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: '設備 ID 格式錯誤',
            },
          });
        }

        const device = await deviceService.getDeviceById(deviceId);

        if (!device) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'DEVICE_NOT_FOUND',
              message: '找不到指定的設備',
            },
          });
        }

        return reply.code(200).send({
          success: true,
          data: { device },
        });
      } catch (error) {
        logger.error(`Error in GET /api/devices/:id:`, error);
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

  logger.info('Device routes registered');
}
