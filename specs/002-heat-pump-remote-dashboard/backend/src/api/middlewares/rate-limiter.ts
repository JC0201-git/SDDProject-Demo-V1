import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../database/connection';
import { logger } from '../../utils/logger';

const RATE_LIMIT_COOLDOWN_SECONDS = 10;

/**
 * 控制指令速率限制中介軟體
 * 每台設備每 10 秒最多 1 次控制指令
 */
export async function rateLimiter(
  request: FastifyRequest<{
    Params: { deviceId?: string };
    Body: { deviceId?: number };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    // 從 URL 參數或 Body 取得 deviceId
    const deviceIdStr = request.params.deviceId;
    const deviceIdBody = (request.body as { deviceId?: number })?.deviceId;
    const deviceId = deviceIdStr ? parseInt(deviceIdStr, 10) : deviceIdBody;

    if (!deviceId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '缺少 deviceId 參數',
        },
      });
    }

    // 查詢設備最後控制時間
    const device = await prisma.heatPumpDevice.findUnique({
      where: { id: deviceId },
      select: { lastControlledAt: true, deviceName: true },
    });

    if (!device) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: '找不到指定的設備',
        },
      });
    }

    // 檢查是否在冷卻期內
    if (device.lastControlledAt) {
      const timeSinceLastControl = Date.now() - device.lastControlledAt.getTime();
      const cooldownRemaining = RATE_LIMIT_COOLDOWN_SECONDS * 1000 - timeSinceLastControl;

      if (cooldownRemaining > 0) {
        logger.warn(
          { deviceId, cooldownRemaining },
          'Rate limit exceeded for control command'
        );

        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `控制指令過於頻繁，請於 ${Math.ceil(cooldownRemaining / 1000)} 秒後再試`,
            details: {
              cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
              deviceName: device.deviceName,
            },
          },
        });
      }
    }

    // 通過速率限制，更新最後控制時間
    await prisma.heatPumpDevice.update({
      where: { id: deviceId },
      data: { lastControlledAt: new Date() },
    });

    logger.debug({ deviceId }, 'Rate limit check passed');
  } catch (error) {
    logger.error({ error }, 'Error in rate limiter middleware');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '系統發生錯誤，請稍後再試',
      },
    });
  }
}
