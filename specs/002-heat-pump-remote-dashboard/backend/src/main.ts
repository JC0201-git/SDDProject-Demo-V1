import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { testDatabaseConnection, disconnectDatabase } from './database/connection';
import { registerRoutes } from './api/routes/index';
import { errorHandler } from './api/middlewares/error-handler';
import { initWebSocket } from './api/websocket';
import { connectMqtt, disconnectMqtt } from './services/mqtt';
import { startCleanupScheduler } from './services/cleanup';

// 載入環境變數
config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * 初始化 Fastify 伺服器
 */
async function createServer() {
  const fastify = Fastify({
    logger: false, // 使用自訂的 pino logger
  });

  // 註冊 CORS
  await fastify.register(fastifyCors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // 註冊 Cookie 支援
  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'heat-pump-dashboard-secret',
  });

  // 註冊全域錯誤處理器
  fastify.setErrorHandler(errorHandler);

  // 註冊 API 路由
  await registerRoutes(fastify);

  return fastify;
}

/**
 * 啟動伺服器
 */
async function start() {
  try {
    logger.info('🚀 Starting Heat Pump Dashboard Backend...');

    // 1. 測試資料庫連線
    logger.info('Connecting to database...');
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // 2. 連線到 MQTT Broker
    logger.info('Connecting to MQTT broker...');
    await connectMqtt();

    // 3. 建立 Fastify 伺服器
    logger.info('Initializing Fastify server...');
    const fastify = await createServer();

    // 4. 啟動 HTTP 伺服器
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`✅ HTTP server listening on http://${HOST}:${PORT}`);

    // 5. 初始化 WebSocket 伺服器
    logger.info('Initializing WebSocket server...');
    const httpServer = fastify.server;
    initWebSocket(httpServer);

    // 6. 啟動資料清理排程器
    logger.info('Starting data cleanup scheduler...');
    startCleanupScheduler();

    logger.info('✅ All services started successfully');
    logger.info(`📊 Dashboard: http://${HOST}:${PORT}/health`);

    // 優雅關閉處理
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // 關閉 MQTT 連線
        logger.info('Disconnecting MQTT...');
        await disconnectMqtt();

        // 關閉 Fastify 伺服器（會同時關閉 WebSocket）
        logger.info('Closing HTTP server...');
        await fastify.close();

        // 關閉資料庫連線
        logger.info('Disconnecting database...');
        await disconnectDatabase();

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

// 啟動伺服器
start();
