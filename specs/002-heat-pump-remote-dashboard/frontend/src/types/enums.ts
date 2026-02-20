export enum DeviceStatus {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
  OFFLINE = 'OFFLINE',
}

export enum OperationMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum ComponentType {
  COMPRESSOR = 'COMPRESSOR',
  FAN = 'FAN',
  WATER_TANK = 'WATER_TANK',
  VALVE = 'VALVE',
  PUMP = 'PUMP',
  SENSOR = 'SENSOR',
}

export enum ComponentStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

export enum CommandType {
  START = 'START',
  STOP = 'STOP',
  SET_MODE = 'SET_MODE',
  SET_TEMPERATURE = 'SET_TEMPERATURE',
}

export enum CommandStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}
