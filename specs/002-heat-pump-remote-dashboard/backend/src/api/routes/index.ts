import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { registerDeviceRoutes } from './devices';
import { registerNotificationRoutes } from './notifications';
import { logger } from '../../utils/logger';

/**
 * 註冊所有 API 路由
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // 健康檢查端點
  fastify.get('/health', async () => {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // 註冊認證路由
  await fastify.register(authRoutes, { prefix: '/api/auth' });

  // 註冊設備路由
  await registerDeviceRoutes(fastify);

  // 註冊通知路由
  await registerNotificationRoutes(fastify);

  // TODO: Phase 5+ - 註冊其他 API 路由
  // await fastify.register(telemetryRoutes, { prefix: '/api/telemetry' });
  // await fastify.register(commandRoutes, { prefix: '/api/commands' });

  logger.info('✅ API routes registered');
}
