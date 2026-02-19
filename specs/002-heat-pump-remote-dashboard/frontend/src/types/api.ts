import { DeviceSummary, Notification, GlobalSummary } from './models';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  username: string;
  displayName: string;
  sessionExpiresAt: string;
}

export interface GetDevicesResponse {
  devices: DeviceSummary[];
  summary: GlobalSummary;
}

export interface GetNotificationsParams {
  isRead?: boolean;
  severity?: string;
  deviceId?: number;
  limit?: number;
  offset?: number;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetUnreadCountResponse {
  unreadCount: number;
}

export interface GetHistoricalTrendParams {
  deviceId: number;
  parameter: string;
  timeRange: string;
  aggregation?: string;
}

export interface SendCommandRequest {
  deviceId: number;
  commandType: string;
  payload: Record<string, unknown>;
}

export interface SendCommandResponse {
  commandId: number;
}
