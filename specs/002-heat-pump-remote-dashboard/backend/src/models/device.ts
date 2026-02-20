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
 */
export interface DeviceListItem {
  id: number;
  deviceCode: string;
  deviceName: string;
  status: DeviceStatus;
  statusLight: StatusLightColor;
  operationMode: OperationMode;
  currentCOP: number | null;
  instantPowerConsumption: number | null;
  waterTankTemperature: number | null;
  lastDataReceivedAt: Date | null;
}

/**
 * 全域總覽統計資料
 */
export interface GlobalSummary {
  onlineDeviceCount: number;
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
    id: device.id,
    deviceCode: device.deviceCode,
    deviceName: device.deviceName,
    status: device.status,
    statusLight: getStatusLightColor(device.status),
    operationMode: device.operationMode,
    currentCOP: device.currentCOP,
    instantPowerConsumption: device.instantPowerConsumption,
    waterTankTemperature: device.waterTankTemperature,
    lastDataReceivedAt: device.lastDataReceivedAt,
  };
}
