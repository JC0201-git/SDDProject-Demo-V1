// ============================================================================
// API 服務：Devices（設備管理）
// ============================================================================
// 實作 getDevices() 函式（呼叫 GET /api/devices）
// ============================================================================

import { apiClient } from './client';
import { ApiResponse, GetDevicesResponse } from '../../types/api';
import { DeviceSummary, GlobalSummary } from '../../types/models';

/**
 * 設備清單與總覽回應
 */
export interface DevicesWithSummary {
  devices: DeviceSummary[];
  summary: GlobalSummary;
}

/**
 * 取得所有設備清單與總覽統計
 */
export async function getDevices(): Promise<DevicesWithSummary> {
  const response = await apiClient.get<ApiResponse<DevicesWithSummary>>('/api/devices');
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || '取得設備清單失敗');
  }
  
  return response.data.data;
}

/**
 * 取得單一設備詳細資訊
 */
export async function getDeviceDetail(deviceId: number): Promise<any> {
  const response = await apiClient.get<ApiResponse<{ device: any }>>(
    `/api/devices/${deviceId}`
  );
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || '取得設備詳細資訊失敗');
  }
  
  return response.data.data.device;
}
