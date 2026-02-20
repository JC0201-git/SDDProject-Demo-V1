import {
  DeviceStatus,
  OperationMode,
  NotificationSeverity,
  ComponentType,
  ComponentStatus,
  CommandType,
  CommandStatus,
} from './enums';

export interface User {
  userId: number;
  username: string;
  displayName: string;
  sessionExpiresAt: string;
}

export interface DeviceSummary {
  deviceId: number;
  deviceName: string;
  serialNumber: string;
  status: DeviceStatus;
  operationMode: OperationMode;
  currentTemperature: number | null;
  targetTemperature: number | null;
  powerConsumption: number | null;
  heatOutput: number | null;
  cop: number | null;
  lastDataReceivedAt: string | null;
  indicatorColor: 'green' | 'red' | 'gray';
}

export interface DeviceDetail extends DeviceSummary {
  components: Component[];
  telemetry: TelemetryData | null;
}

export interface Component {
  componentId: number;
  deviceId: number;
  componentType: ComponentType;
  componentName: string;
  status: ComponentStatus;
  currentValue: number | null;
  unit: string | null;
  lastUpdatedAt: string;
}

export interface TelemetryData {
  telemetryId: number;
  deviceId: number;
  timestamp: string;
  compressorFrequency: number | null;
  inletPressure: number | null;
  outletPressure: number | null;
  inletTemperature: number | null;
  outletTemperature: number | null;
  ambientTemperature: number | null;
  powerConsumption: number | null;
  heatOutput: number | null;
  cop: number | null;
  components: Record<string, unknown> | null;
}

export interface Notification {
  notificationId: number;
  deviceId: number | null;
  deviceName: string | null;
  severity: NotificationSeverity;
  eventType: string;
  message: string;
  occurredAt: string;
  isRead: boolean;
  readAt: string | null;
}

export interface Command {
  commandId: number;
  deviceId: number;
  commandType: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  issuedBy: number;
  issuedAt: string;
  sentAt: string | null;
  acknowledgedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface GlobalSummary {
  totalDevices: number;
  onlineDevices: number;
  normalDevices: number;
  abnormalDevices: number;
  offlineDevices: number;
  totalPowerConsumption: number;
  totalHeatOutput: number;
  averageCOP: number | null;
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  isAbnormal: boolean;
}

export interface HistoricalTrend {
  deviceId: number;
  parameter: string;
  dataPoints: TrendDataPoint[];
  timeRange: string;
  aggregation: string;
}
