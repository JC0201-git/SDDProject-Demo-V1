// ============================================================================
// 服務層：Device（設備管理）
// ============================================================================
// 包含查詢所有設備、計算總覽統計資訊、設備離線偵測邏輯（含防抖機制）
// ============================================================================

import { PrismaClient, DeviceStatus } from '@prisma/client';
import { DeviceModel, DeviceListItem, GlobalSummary, DevicesWithSummaryResponse, toDeviceListItem } from '../models/device';
import { logger } from '../utils/logger';
import { notificationService } from './notification';

const prisma = new PrismaClient();

/**
 * 設備離線檢測狀態追蹤
 */
interface OfflineDetectionState {
  consecutiveOnlineCount: number; // 連續接收到資料的次數
  offlineNotificationSent: boolean; // 是否已發送離線通知
}

/**
 * 設備管理服務
 */
export class DeviceService {
  // 設備離線檢測狀態快取（deviceId -> state）
  private offlineStates: Map<number, OfflineDetectionState> = new Map();
  
  // 防抖參數
  private readonly OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 秒無資料才標記 OFFLINE
  private readonly ONLINE_CONSECUTIVE_COUNT = 2; // 連續 2 次資料才標記 ONLINE

  /**
   * 取得所有設備（含總覽統計）
   */
  async getDevicesWithSummary(): Promise<DevicesWithSummaryResponse> {
    try {
      const devices = await prisma.heatPumpDevice.findMany({
        orderBy: { deviceCode: 'asc' },
      });

      // 轉換為清單項目
      const deviceList: DeviceListItem[] = devices.map((d) => 
        toDeviceListItem(d as DeviceModel)
      );

      // 計算總覽統計
      const summary = this.calculateGlobalSummary(devices as DeviceModel[]);

      return {
        devices: deviceList,
        summary,
      };
    } catch (error) {
      logger.error('Failed to get devices with summary:', error);
      throw error;
    }
  }

  /**
   * 取得單一設備詳細資訊
   */
  async getDeviceById(deviceId: number): Promise<DeviceModel | null> {
    try {
      const device = await prisma.heatPumpDevice.findUnique({
        where: { id: deviceId },
      });

      return device as DeviceModel | null;
    } catch (error) {
      logger.error(`Failed to get device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 計算全域總覽統計資訊
   */
  private calculateGlobalSummary(devices: DeviceModel[]): GlobalSummary {
    let onlineDeviceCount = 0;
    let totalPowerConsumption = 0;
    let totalHeatOutput = 0;
    let copSum = 0;
    let copCount = 0;

    for (const device of devices) {
      // 計算在線設備數（NORMAL 或 ABNORMAL 視為在線）
      if (device.status === 'NORMAL' || device.status === 'ABNORMAL') {
        onlineDeviceCount++;
      }

      // 累加耗電量與產熱量
      if (device.instantPowerConsumption !== null) {
        totalPowerConsumption += device.instantPowerConsumption;
      }
      if (device.instantHeatOutput !== null) {
        totalHeatOutput += device.instantHeatOutput;
      }

      // 累加 COP（用於計算平均值）
      if (device.currentCOP !== null && device.currentCOP > 0) {
        copSum += device.currentCOP;
        copCount++;
      }
    }

    // 計算平均 COP
    const averageCOP = copCount > 0 ? copSum / copCount : 0;

    return {
      onlineDeviceCount,
      totalPowerConsumption: Math.round(totalPowerConsumption * 10) / 10, // 保留 1 位小數
      totalHeatOutput: Math.round(totalHeatOutput * 10) / 10,
      averageCOP: Math.round(averageCOP * 100) / 100, // 保留 2 位小數
    };
  }

  /**
   * 檢查設備離線狀態（含防抖機制）
   * 呼叫時機：定時任務每分鐘執行一次
   */
  async checkOfflineDevices(): Promise<void> {
    try {
      const now = new Date();
      const devices = await prisma.heatPumpDevice.findMany();

      for (const device of devices) {
        const deviceId = device.id;
        const lastDataTime = device.lastDataReceivedAt;

        // 初始化設備狀態
        if (!this.offlineStates.has(deviceId)) {
          this.offlineStates.set(deviceId, {
            consecutiveOnlineCount: 0,
            offlineNotificationSent: false,
          });
        }

        const state = this.offlineStates.get(deviceId)!;

        // 情況 1：設備當前在線，但超過 30 秒未收到資料 → 標記為 OFFLINE
        if (
          (device.status === 'NORMAL' || device.status === 'ABNORMAL') &&
          lastDataTime &&
          now.getTime() - lastDataTime.getTime() > this.OFFLINE_THRESHOLD_MS
        ) {
          await prisma.heatPumpDevice.update({
            where: { id: deviceId },
            data: { status: 'OFFLINE' },
          });

          // 發送離線通知（僅發送一次）
          if (!state.offlineNotificationSent) {
            await notificationService.createOfflineNotification(
              deviceId,
              device.deviceName
            );
            state.offlineNotificationSent = true;
          }

          // 重置連續在線計數
          state.consecutiveOnlineCount = 0;

          logger.warn(`Device ${device.deviceName} (${device.deviceCode}) marked as OFFLINE`);
        }

        // 情況 2：設備當前離線，但最近收到資料 → 需要連續 2 次資料才標記為 ONLINE
        if (
          device.status === 'OFFLINE' &&
          lastDataTime &&
          now.getTime() - lastDataTime.getTime() <= this.OFFLINE_THRESHOLD_MS
        ) {
          state.consecutiveOnlineCount++;

          if (state.consecutiveOnlineCount >= this.ONLINE_CONSECUTIVE_COUNT) {
            // 連續收到 2 次資料，標記為 ONLINE（狀態為 NORMAL）
            await prisma.heatPumpDevice.update({
              where: { id: deviceId },
              data: { status: 'NORMAL' },
            });

            // 重置狀態
            state.consecutiveOnlineCount = 0;
            state.offlineNotificationSent = false;

            logger.info(`Device ${device.deviceName} (${device.deviceCode}) recovered to ONLINE`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check offline devices:', error);
    }
  }

  /**
   * 更新設備狀態（當接收到 MQTT 資料時呼叫）
   */
  async updateDeviceStatus(
    deviceId: number,
    status: DeviceStatus
  ): Promise<void> {
    try {
      await prisma.heatPumpDevice.update({
        where: { id: deviceId },
        data: {
          status,
          lastDataReceivedAt: new Date(),
        },
      });

      // 如果設備恢復正常，重置離線檢測狀態
      if (status !== 'OFFLINE') {
        const state = this.offlineStates.get(deviceId);
        if (state) {
          state.consecutiveOnlineCount++;
          if (state.consecutiveOnlineCount >= this.ONLINE_CONSECUTIVE_COUNT) {
            state.offlineNotificationSent = false;
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to update device ${deviceId} status:`, error);
      throw error;
    }
  }

  /**
   * 根據設備編號取得設備
   */
  async getDeviceByCode(deviceCode: string): Promise<DeviceModel | null> {
    try {
      const device = await prisma.heatPumpDevice.findUnique({
        where: { deviceCode },
      });

      return device as DeviceModel | null;
    } catch (error) {
      logger.error(`Failed to get device by code ${deviceCode}:`, error);
      throw error;
    }
  }
}

// 單例模式
export const deviceService = new DeviceService();
