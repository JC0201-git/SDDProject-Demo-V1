import cron from 'node-cron';
import { prisma } from '../database/connection';
import { logger } from '../utils/logger';
import { deviceService } from './device';
import { ControlCommandStatus } from '@prisma/client';

/**
 * 資料清理服務
 * 排程刪除過期的遙測資料、操作記錄與通知
 */

/**
 * 清理超過 30 天的遙測資料
 */
async function cleanupTelemetryData(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.telemetryData.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    logger.info(
      { deletedCount: result.count, cutoffDate: thirtyDaysAgo },
      'Cleaned up old telemetry data'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to clean up telemetry data');
  }
}

/**
 * 清理超過 30 天的控制指令記錄
 */
async function cleanupControlCommands(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.controlCommand.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    logger.info(
      { deletedCount: result.count, cutoffDate: thirtyDaysAgo },
      'Cleaned up old control commands'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to clean up control commands');
  }
}

/**
 * 清理超過 7 天的通知
 */
async function cleanupNotifications(): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    logger.info(
      { deletedCount: result.count, cutoffDate: sevenDaysAgo },
      'Cleaned up old notifications'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to clean up notifications');
  }
}

/**
 * 檢查控制指令超時
 * 超過 3 秒仍未收到確認的指令標記為 TIMEOUT
 */
async function checkCommandTimeout(): Promise<void> {
  try {
    const threeSecondsAgo = new Date();
    threeSecondsAgo.setSeconds(threeSecondsAgo.getSeconds() - 3);

    const result = await prisma.controlCommand.updateMany({
      where: {
        status: ControlCommandStatus.PENDING,
        sentAt: {
          lt: threeSecondsAgo,
        },
      },
      data: {
        status: ControlCommandStatus.TIMEOUT,
      },
    });

    if (result.count > 0) {
      logger.warn({ timeoutCount: result.count }, 'Command timeout detected');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to check command timeout');
  }
}

/**
 * 執行所有清理任務
 */
async function runCleanupTasks(): Promise<void> {
  logger.info('Starting scheduled data cleanup tasks');

  await Promise.all([
    cleanupTelemetryData(),
    cleanupControlCommands(),
    cleanupNotifications(),
  ]);

  logger.info('Completed scheduled data cleanup tasks');
}

/**
 * 啟動資料清理排程器
 * - 每日凌晨 3:00 執行資料清理
 * - 每分鐘檢查設備離線狀態（T050: 整合設備離線偵測）
 * - 每 10 秒檢查控制指令超時
 */
export function startCleanupScheduler(): void {
  // 每日凌晨 3:00 執行（Cron 表達式：0 3 * * *）
  cron.schedule('0 3 * * *', runCleanupTasks, {
    timezone: 'Asia/Taipei',
  });

  // T050: 每分鐘檢查設備離線狀態（含防抖機制）
  cron.schedule('* * * * *', async () => {
    try {
      await deviceService.checkOfflineDevices();
    } catch (error) {
      logger.error({ error }, 'Error checking offline devices');
    }
  });

  // 每 10 秒檢查控制指令超時
  cron.schedule('*/10 * * * * *', async () => {
    try {
      await checkCommandTimeout();
    } catch (error) {
      logger.error({ error }, 'Error checking command timeout');
    }
  });

  logger.info('Data cleanup scheduler started (runs daily at 3:00 AM)');
  logger.info('Device offline checker started (runs every minute)');
  logger.info('Command timeout checker started (runs every 10 seconds)');
}

/**
 * 手動觸發清理任務（用於測試）
 */
export async function manualCleanup(): Promise<void> {
  await runCleanupTasks();
}
