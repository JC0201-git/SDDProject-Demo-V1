// ============================================================================
// 模型層：HeatPumpDevice（熱泵設備）
// ============================================================================
// 定義設備實體介面與燈號顏色計算邏輯
// ============================================================================

import { DeviceStatus, OperationMode } from '@prisma/client';

/**
 * 設備狀態燈號顏色
 */
export type StatusLightColor = 'green' | 'red' | 'gray';

/**
 * 設備實體介面（對應 Prisma Schema）
 */
export interface DeviceModel {
  id: number;
  deviceCode: string;
  deviceName: string;
  status: DeviceStatus;
  operationMode: OperationMode;
  
  // 即時參數
  compressorFrequency: number | null;
  exhaustTemperature: number | null;
  suctionTemperature: number | null;
  highPressure: number | null;
  lowPressure: number | null;
  waterTankTemperature: number | null;
  waterInTemperature: number | null;
  waterOutTemperature: number | null;
  targetWaterTemperature: number | null;
  
  // 效能指標
  instantPowerConsumption: number | null;
  instantHeatOutput: number | null;
  currentCOP: number | null;
  
  lastDataReceivedAt: Date | null;
  lastControlledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 設備清單項目（用於全域儀表板顯示）
 * 欄位名稱對齊前端 DeviceSummary 型別定義
 */
export interface DeviceListItem {
  deviceId: number;
  deviceCode: string;
  serialNumber: string;
  deviceName: string;
  status: DeviceStatus;
  indicatorColor: StatusLightColor;
  operationMode: OperationMode;
  cop: number | null;
  powerConsumption: number | null;
  heatOutput: number | null;
  currentTemperature: number | null;
  targetTemperature: number | null;
  lastDataReceivedAt: Date | null;
}

/**
 * 全域總覽統計資料
 * 欄位名稱對齊前端 GlobalSummary 型別定義
 */
export interface GlobalSummary {
  totalDevices: number;
  onlineDevices: number;
  normalDevices: number;
  abnormalDevices: number;
  offlineDevices: number;
  totalPowerConsumption: number;
  totalHeatOutput: number;
  averageCOP: number;
}

/**
 * 設備清單與總覽回應
 */
export interface DevicesWithSummaryResponse {
  summary: GlobalSummary;
  devices: DeviceListItem[];
}

/**
 * 計算設備狀態燈號顏色
 * NORMAL → 綠色
 * ABNORMAL → 紅色
 * OFFLINE → 灰色
 */
export function getStatusLightColor(status: DeviceStatus): StatusLightColor {
  switch (status) {
    case 'NORMAL':
      return 'green';
    case 'ABNORMAL':
      return 'red';
    case 'OFFLINE':
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * 轉換設備模型為清單項目
 */
export function toDeviceListItem(device: DeviceModel): DeviceListItem {
  return {
    deviceId: device.id,
    deviceCode: device.deviceCode,
    serialNumber: device.deviceCode,
    deviceName: device.deviceName,
    status: device.status,
    indicatorColor: getStatusLightColor(device.status),
    operationMode: device.operationMode,
    cop: device.currentCOP,
    powerConsumption: device.instantPowerConsumption,
    heatOutput: device.instantHeatOutput,
    currentTemperature: device.waterTankTemperature,
    targetTemperature: device.targetWaterTemperature,
    lastDataReceivedAt: device.lastDataReceivedAt,
  };
}
