# Data Model: 熱泵遠端管理儀表板（前端）

**Date**: 2026-02-17  
**Phase**: 1 - Design & Contracts  
**Input**: 關鍵實體 from spec.md + research.md technical decisions

## Overview

本文檔定義熱泵遠端管理儀表板的前端資料模型，包含 TypeScript 介面定義、API 資料格式、及狀態管理結構。設計遵循 Constitution 原則：明確區分 Server Cache（設備資料）、Global State（使用者 session）、Local State（UI 狀態）。

## State Management Architecture

根據 research.md 決策，採用以下狀態管理策略：

- **Server Cache (React Query)**: 設備資料、即時數據、歷史趨勢 → 使用 `useQuery` / `useMutation`
- **Global State (Context API)**: 使用者 session、權限資訊 → 使用 `UserContext`
- **Local State (useState)**: UI 臨時狀態（對話框、表單輸入） → 使用 `useState`

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐
│    User     │◄────────│ OperationLog     │
│  (使用者)   │ records │   (操作紀錄)      │
└──────┬──────┘         └──────────────────┘
       │                         │
       │                         │ references
       │                         │
       │ creates                 ▼
       │                 ┌──────────────────┐
       │                 │ ControlCommand   │
       │                 │   (控制指令)      │
       │                 └────────┬─────────┘
       │                          │
       │                          │ targets
       │                          │
       ▼                          ▼
┌─────────────┐         ┌──────────────────┐
│ ThresholdCfg│◄────────│     Device       │
│ (閥值配置)   │ belongs │    (設備)         │
└─────────────┘   to    └────────┬─────────┘
                                 │
                                 │ has many
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
       ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
       │ Component   │  │ RealtimeData │  │HistoricalData│
       │  (元件)      │  │ (即時資料)    │  │ (歷史資料)    │
       └─────────────┘  └──────────────┘  └──────────────┘
```

---

## 1. User (使用者)

**用途**: 系統管理人員帳號，支援三級權限控制（FR-023, FR-024, FR-026）

### Database Schema (PostgreSQL)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  display_name VARCHAR(100),
  email VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'operator', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  session_token VARCHAR(255),
  session_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_session_token ON users(session_token);
CREATE INDEX idx_users_session_expires ON users(session_expires_at);
```

### Backend Model (Pydantic)

```python
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from datetime import datetime
from uuid import UUID

class UserRole(str, Enum):
    VIEWER = "viewer"      # 僅查看
    OPERATOR = "operator"  # 可控制設備
    ADMIN = "admin"        # 完整權限

class User(BaseModel):
    id: UUID
    username: str = Field(..., min_length=3, max_length=50)
    display_name: str | None = None
    email: EmailStr | None = None
    role: UserRole
    is_active: bool = True
    last_login_at: datetime | None = None
    created_at: datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    display_name: str | None = None
    email: EmailStr | None = None
    role: UserRole = UserRole.VIEWER

class UserLogin(BaseModel):
    username: str
    password: str

class UserSession(BaseModel):
    id: UUID
    username: str
    display_name: str | None
    role: UserRole
    token: str
    expires_at: datetime
```

### Frontend TypeScript Interface

```typescript
export enum UserRole {
  VIEWER = 'viewer',
  OPERATOR = 'operator',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;  // ISO 8601 timestamp
  createdAt: string;
}

export interface UserSession {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  token: string;
  expiresAt: string;
}
```

### Navigation

- **關聯**: 一個 User 可建立多筆 OperationLog、ControlCommand
- **權限邏輯**: 
  - `viewer`: 可讀取 devices, realtime_data, historical_data
  - `operator`: viewer 權限 + 可寫入 control_commands
  - `admin`: operator 權限 + 可修改 threshold_config, 管理 users

---

## 2. Device (設備)

**用途**: 代表一台熱泵設備，記錄設備基本資訊及當前狀態（FR-003, FR-004）

### Database Schema (PostgreSQL)

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code VARCHAR(50) UNIQUE NOT NULL,  -- 設備編號（唯一識別）
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'running', 'stopped', 'error')),
  mode VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto', 'manual')),
  
  -- 當前運作參數（最新值快照，避免頻繁查詢 time-series table）
  current_compressor_frequency FLOAT,       -- 壓縮機頻率 (Hz)
  current_temperature_exhaust FLOAT,        -- 排氣溫度 (°C)
  current_temperature_intake FLOAT,         -- 吸氣溫度 (°C)
  current_pressure FLOAT,                   -- 冷媒壓力 (bar)
  current_temperature_water_tank FLOAT,     -- 水箱溫度 (°C)
  current_target_temperature FLOAT,         -- 目標水溫 (°C)
  current_power_kw FLOAT,                   -- 瞬時耗電量 (kW)
  current_heat_output_kw FLOAT,             -- 瞬時產熱量 (kW)
  current_cop FLOAT,                        -- COP 值
  
  last_data_at TIMESTAMPTZ,                 -- 最後收到資料的時間（用於偵測離線 FR-018）
  metadata JSONB,                           -- 彈性欄位（設備型號、韌體版本等）
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_code ON devices(device_code);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_last_data ON devices(last_data_at);
```

### Backend Model (Pydantic)

```python
class DeviceStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"

class DeviceMode(str, Enum):
    AUTO = "auto"
    MANUAL = "manual"

class Device(BaseModel):
    id: UUID
    device_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    location: str | None = None
    status: DeviceStatus
    mode: DeviceMode
    
    # Current parameters (snapshot)
    current_compressor_frequency: float | None = None
    current_temperature_exhaust: float | None = None
    current_temperature_intake: float | None = None
    current_pressure: float | None = None
    current_temperature_water_tank: float | None = None
    current_target_temperature: float | None = None
    current_power_kw: float | None = None
    current_heat_output_kw: float | None = None
    current_cop: float | None = None
    
    last_data_at: datetime | None = None
    metadata: dict | None = None
    created_at: datetime
    updated_at: datetime

class DeviceCreate(BaseModel):
    device_code: str
    name: str
    location: str | None = None
    mode: DeviceMode = DeviceMode.AUTO

class DeviceSummary(BaseModel):
    """全域儀表板顯示用（FR-003）"""
    total_devices: int
    online_devices: int
    offline_devices: int
    running_devices: int
    error_devices: int
    total_power_kw: float
    total_heat_output_kw: float
    average_cop: float
```

### Frontend TypeScript Interface

```typescript
export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export enum DeviceMode {
  AUTO = 'auto',
  MANUAL = 'manual'
}

export interface Device {
  id: string;
  deviceCode: string;
  name: string;
  location?: string;
  status: DeviceStatus;
  mode: DeviceMode;
  
  // Current snapshot
  currentCompressorFrequency?: number;
  currentTemperatureExhaust?: number;
  currentTemperatureIntake?: number;
  currentPressure?: number;
  currentTemperatureWaterTank?: number;
  currentTargetTemperature?: number;
  currentPowerKw?: number;
  currentHeatOutputKw?: number;
  currentCop?: number;
  
  lastDataAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  runningDevices: number;
  errorDevices: number;
  totalPowerKw: number;
  totalHeatOutputKw: number;
  averageCop: number;
}
```

---

## 3. Component (元件)

**用途**: 設備內子元件狀態（風扇、幫浦、壓縮機等），FR-006 要求顯示元件狀態

### Database Schema (PostgreSQL)

```sql
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  component_code VARCHAR(50) NOT NULL,      -- 元件編號（例如 fan_1, pump_1）
  component_type VARCHAR(50) NOT NULL,      -- 元件類型（fan, pump, compressor, valve）
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'error')),
  metadata JSONB,                           -- 額外參數（轉速、功率等）
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(device_id, component_code)
);

CREATE INDEX idx_components_device ON components(device_id);
```

### Backend Model (Pydantic)

```python
class ComponentStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"

class Component(BaseModel):
    id: UUID
    device_id: UUID
    component_code: str
    component_type: str  # fan, pump, compressor, valve, etc.
    name: str
    status: ComponentStatus
    metadata: dict | None = None
    created_at: datetime
    updated_at: datetime
```

### Frontend TypeScript Interface

```typescript
export enum ComponentStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface Component {
  id: string;
  deviceId: string;
  componentCode: string;
  componentType: string;
  name: string;
  status: ComponentStatus;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. RealtimeData (即時資料)

**用途**: 設備回報的即時監測數據（FR-001, FR-002），使用 TimescaleDB Hypertable 優化時間序列查詢

### Database Schema (TimescaleDB)

```sql
CREATE TABLE device_realtime_data (
  time TIMESTAMPTZ NOT NULL,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  
  -- 運作參數
  compressor_frequency FLOAT,
  temperature_exhaust FLOAT,
  temperature_intake FLOAT,
  temperature_water_tank FLOAT,
  pressure FLOAT,
  
  -- 效能指標
  power_kw FLOAT,
  heat_output_kw FLOAT,
  cop FLOAT,
  
  -- 資料品質
  data_quality VARCHAR(20) DEFAULT 'normal' CHECK (data_quality IN ('normal', 'anomaly')),  -- FR-022
  
  metadata JSONB  -- 彈性欄位（其他感測器數據）
);

-- Convert to hypertable (時間分區）
SELECT create_hypertable('device_realtime_data', 'time');

-- Set 30-day retention policy (FR-008)
SELECT add_retention_policy('device_realtime_data', INTERVAL '30 days');

-- Indexes for efficient queries
CREATE INDEX idx_realtime_device_time ON device_realtime_data(device_id, time DESC);
```

### Backend Model (Pydantic)

```python
class DataQuality(str, Enum):
    NORMAL = "normal"
    ANOMALY = "anomaly"

class RealtimeData(BaseModel):
    time: datetime
    device_id: UUID
    compressor_frequency: float | None = None
    temperature_exhaust: float | None = None
    temperature_intake: float | None = None
    temperature_water_tank: float | None = None
    pressure: float | None = None
    power_kw: float | None = None
    heat_output_kw: float | None = None
    cop: float | None = None
    data_quality: DataQuality = DataQuality.NORMAL
    metadata: dict | None = None

class RealtimeDataCreate(BaseModel):
    """IoT 設備推送資料格式"""
    device_code: str  # 設備編號（後端轉為 device_id）
    timestamp: datetime
    parameters: dict  # 彈性接收所有參數
```

### Frontend TypeScript Interface

```typescript
export enum DataQuality {
  NORMAL = 'normal',
  ANOMALY = 'anomaly'
}

export interface RealtimeData {
  time: string;  // ISO 8601
  deviceId: string;
  compressorFrequency?: number;
  temperatureExhaust?: number;
  temperatureIntake?: number;
  temperatureWaterTank?: number;
  pressure?: number;
  powerKw?: number;
  heatOutputKw?: number;
  cop?: number;
  dataQuality: DataQuality;
  metadata?: Record<string, any>;
}
```

---

## 5. HistoricalData (歷史資料)

**用途**: 聚合後的歷史趨勢資料（FR-007），用於減少圖表查詢負載（原始資料每秒一筆，歷史資料可聚合為每分鐘/小時一筆）

### Database Schema (TimescaleDB)

```sql
-- Continuous aggregate for 1-minute average (減輕長時間查詢負擔）
CREATE MATERIALIZED VIEW device_1min_avg
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  device_id,
  AVG(compressor_frequency) AS avg_compressor_frequency,
  AVG(temperature_exhaust) AS avg_temperature_exhaust,
  AVG(temperature_intake) AS avg_temperature_intake,
  AVG(temperature_water_tank) AS avg_temperature_water_tank,
  AVG(pressure) AS avg_pressure,
  AVG(power_kw) AS avg_power_kw,
  AVG(heat_output_kw) AS avg_heat_output_kw,
  AVG(cop) AS avg_cop,
  MAX(temperature_exhaust) AS max_temperature_exhaust,
  MIN(temperature_exhaust) AS min_temperature_exhaust
FROM device_realtime_data
GROUP BY bucket, device_id;

-- Refresh policy (每 5 分鐘更新一次）
SELECT add_continuous_aggregate_policy('device_1min_avg',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '5 minutes');

-- Continuous aggregate for 1-hour average (For 30-day trend)
CREATE MATERIALIZED VIEW device_1hour_avg
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  device_id,
  AVG(compressor_frequency) AS avg_compressor_frequency,
  AVG(temperature_exhaust) AS avg_temperature_exhaust,
  AVG(temperature_intake) AS avg_temperature_intake,
  AVG(temperature_water_tank) AS avg_temperature_water_tank,
  AVG(pressure) AS avg_pressure,
  AVG(power_kw) AS avg_power_kw,
  AVG(heat_output_kw) AS avg_heat_output_kw,
  AVG(cop) AS avg_cop
FROM device_realtime_data
GROUP BY bucket, device_id;
```

### Backend Model (Pydantic)

```python
class HistoricalData(BaseModel):
    """歷史趨勢資料點"""
    timestamp: datetime
    device_id: UUID
    avg_compressor_frequency: float | None = None
    avg_temperature_exhaust: float | None = None
    avg_temperature_intake: float | None = None
    avg_temperature_water_tank: float | None = None
    avg_pressure: float | None = None
    avg_power_kw: float | None = None
    avg_heat_output_kw: float | None = None
    avg_cop: float | None = None
    max_temperature_exhaust: float | None = None
    min_temperature_exhaust: float | None = None

class HistoricalDataQuery(BaseModel):
    """查詢歷史資料參數（FR-007）"""
    device_id: UUID
    start_time: datetime
    end_time: datetime
    interval: str = "1min"  # 1min, 1hour, 1day
    parameters: list[str] = ["temperature_exhaust", "pressure", "cop"]  # 查詢哪些參數
```

### Frontend TypeScript Interface

```typescript
export interface HistoricalData {
  timestamp: string;
  deviceId: string;
  avgCompressorFrequency?: number;
  avgTemperatureExhaust?: number;
  avgTemperatureIntake?: number;
  avgTemperatureWaterTank?: number;
  avgPressure?: number;
  avgPowerKw?: number;
  avgHeatOutputKw?: number;
  avgCop?: number;
  maxTemperatureExhaust?: number;
  minTemperatureExhaust?: number;
}

export interface HistoricalDataQuery {
  deviceId: string;
  startTime: string;
  endTime: string;
  interval: '1min' | '1hour' | '1day';
  parameters: string[];
}
```

---

## 6. ControlCommand (控制指令)

**用途**: 遠端控制指令紀錄（FR-012, FR-013, FR-014），追蹤指令執行狀態

### Database Schema (PostgreSQL)

```sql
CREATE TABLE control_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('switch_mode', 'set_target_temp', 'emergency_stop')),
  command_payload JSONB NOT NULL,  -- 指令內容（例如 {"mode": "manual", "target_temp": 55}）
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'timeout', 'failed')),
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commands_device ON control_commands(device_id);
CREATE INDEX idx_commands_user ON control_commands(user_id);
CREATE INDEX idx_commands_status ON control_commands(status);
CREATE INDEX idx_commands_created ON control_commands(created_at DESC);
```

### Backend Model (Pydantic)

```python
class CommandType(str, Enum):
    SWITCH_MODE = "switch_mode"
    SET_TARGET_TEMP = "set_target_temp"
    EMERGENCY_STOP = "emergency_stop"

class CommandStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    CONFIRMED = "confirmed"
    TIMEOUT = "timeout"
    FAILED = "failed"

class ControlCommand(BaseModel):
    id: UUID
    device_id: UUID
    user_id: UUID
    command_type: CommandType
    command_payload: dict
    status: CommandStatus
    sent_at: datetime | None = None
    confirmed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime

class ControlCommandCreate(BaseModel):
    device_id: UUID
    command_type: CommandType
    command_payload: dict  # 例如 {"mode": "manual", "target_temp": 55}

class SwitchModeCommand(BaseModel):
    """切換模式指令（FR-012）"""
    mode: DeviceMode

class SetTargetTempCommand(BaseModel):
    """設定目標溫度指令（FR-013）"""
    target_temp: float = Field(..., ge=30, le=80)  # 30-80°C 範圍
```

### Frontend TypeScript Interface

```typescript
export enum CommandType {
  SWITCH_MODE = 'switch_mode',
  SET_TARGET_TEMP = 'set_target_temp',
  EMERGENCY_STOP = 'emergency_stop'
}

export enum CommandStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  TIMEOUT = 'timeout',
  FAILED = 'failed'
}

export interface ControlCommand {
  id: string;
  deviceId: string;
  userId: string;
  commandType: CommandType;
  commandPayload: Record<string, any>;
  status: CommandStatus;
  sentAt?: string;
  confirmedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface ControlCommandCreate {
  deviceId: string;
  commandType: CommandType;
  commandPayload: Record<string, any>;
}
```

---

## 7. ThresholdConfig (閥值配置)

**用途**: 異常偵測閥值設定（FR-009, FR-010, FR-011），每台設備可自訂或使用預設值

### Database Schema (PostgreSQL)

```sql
CREATE TABLE threshold_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  parameter_name VARCHAR(50) NOT NULL,  -- temperature_exhaust, pressure, frequency, etc.
  
  upper_limit FLOAT,
  lower_limit FLOAT,
  use_default BOOLEAN DEFAULT TRUE,  -- TRUE=使用系統預設值，FALSE=使用自訂值
  
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(device_id, parameter_name)
);

CREATE INDEX idx_threshold_device ON threshold_configs(device_id);

-- 預設閥值配置表（系統級）
CREATE TABLE default_thresholds (
  parameter_name VARCHAR(50) PRIMARY KEY,
  upper_limit FLOAT,
  lower_limit FLOAT,
  description TEXT
);

-- 插入預設值（FR-010）
INSERT INTO default_thresholds (parameter_name, upper_limit, lower_limit, description) VALUES
  ('temperature_exhaust', 80.0, 0.0, '排氣溫度預設範圍 0-80°C'),
  ('temperature_intake', 40.0, -10.0, '吸氣溫度預設範圍 -10-40°C'),
  ('pressure', 30.0, 5.0, '冷媒壓力預設範圍 5-30 bar'),
  ('compressor_frequency', 120.0, 20.0, '壓縮機頻率預設範圍 20-120 Hz'),
  ('cop', 5.0, 2.0, 'COP 預設範圍 2.0-5.0');
```

### Backend Model (Pydantic)

```python
class ThresholdConfig(BaseModel):
    id: UUID
    device_id: UUID
    parameter_name: str
    upper_limit: float | None = None
    lower_limit: float | None = None
    use_default: bool = True
    updated_by: UUID | None = None
    updated_at: datetime
    created_at: datetime

class ThresholdConfigUpdate(BaseModel):
    """管理員更新閥值（FR-011）"""
    parameter_name: str
    upper_limit: float
    lower_limit: float
    use_default: bool = False  # 設為 False 以使用自訂值

class DefaultThreshold(BaseModel):
    parameter_name: str
    upper_limit: float
    lower_limit: float
    description: str
```

### Frontend TypeScript Interface

```typescript
export interface ThresholdConfig {
  id: string;
  deviceId: string;
  parameterName: string;
  upperLimit?: number;
  lowerLimit?: number;
  useDefault: boolean;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ThresholdConfigUpdate {
  parameterName: string;
  upperLimit: number;
  lowerLimit: number;
  useDefault: boolean;
}

export interface DefaultThreshold {
  parameterName: string;
  upperLimit: number;
  lowerLimit: number;
  description: string;
}
```

---

## 8. OperationLog (操作紀錄)

**用途**: 審計記錄所有遠端控制操作（FR-019），追蹤誰在何時執行何操作

### Database Schema (PostgreSQL)

```sql
CREATE TABLE operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  device_id UUID REFERENCES devices(id),  -- NULL 代表系統級操作（例如修改使用者）
  
  operation_type VARCHAR(50) NOT NULL,  -- control_device, update_threshold, login, etc.
  operation_detail JSONB NOT NULL,      -- 操作詳情（例如 {"action": "switch_mode", "mode": "manual"}）
  
  ip_address VARCHAR(45),               -- IPv4/IPv6
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oplogs_user ON operation_logs(user_id);
CREATE INDEX idx_oplogs_device ON operation_logs(device_id);
CREATE INDEX idx_oplogs_created ON operation_logs(created_at DESC);
CREATE INDEX idx_oplogs_type ON operation_logs(operation_type);
```

### Backend Model (Pydantic)

```python
class OperationLog(BaseModel):
    id: UUID
    user_id: UUID
    device_id: UUID | None = None
    operation_type: str
    operation_detail: dict
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

class OperationLogCreate(BaseModel):
    user_id: UUID
    device_id: UUID | None = None
    operation_type: str
    operation_detail: dict
    ip_address: str | None = None
    user_agent: str | None = None
```

### Frontend TypeScript Interface

```typescript
export interface OperationLog {
  id: string;
  userId: string;
  deviceId?: string;
  operationType: string;
  operationDetail: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface OperationLogQuery {
  userId?: string;
  deviceId?: string;
  operationType?: string;
  startTime?: string;
  endTime?: string;
  page: number;
  pageSize: number;
}
```

---

## Data Validation Rules

### 業務規則

1. **Session Timeout (FR-026)**: 
   - 檢查 `users.session_expires_at < NOW()` → 強制登出
   - 每次 API 請求更新 `session_expires_at = NOW() + 30 minutes`

2. **Device Offline Detection (FR-018)**:
   - 檢查 `devices.last_data_at < NOW() - INTERVAL '5 seconds'` → 標記為 `offline`
   - WebSocket 背景任務每秒執行一次檢查

3. **Anomaly Detection (FR-009)**:
   - 當新資料寫入 `device_realtime_data` 時，觸發 PostgreSQL trigger
   - 比對 `threshold_configs` 或 `default_thresholds`
   - 超出範圍 → 設定 `data_quality = 'anomaly'` 並發送 WebSocket 警示

4. **Command Timeout (FR-014)**:
   - 送出指令後 `status = 'sent'`，若 3 秒內未收到確認 → 更新為 `status = 'timeout'`
   - 前端顯示「設備無回應」錯誤訊息

5. **Permission Validation (FR-024, FR-025)**:
   - `viewer`: 僅能 GET endpoints
   - `operator`: `viewer` + POST `/api/control/commands`
   - `admin`: `operator` + POST/PUT/DELETE `/api/thresholds`, `/api/users`

### 資料完整性

- **CASCADE DELETE**: 刪除 Device 時自動刪除相關的 Components, RealtimeData, ControlCommands, ThresholdConfigs, OperationLogs
- **NOT NULL constraints**: 確保必填欄位（device_code, username, role 等）
- **CHECK constraints**: 限制 enum 值範圍（status, role, mode 等）
- **UNIQUE constraints**: 防止重複（device_code, username, device_id + parameter_name 組合）

---

## State Management Strategy

### 前端狀態分類（遵循 Constitution II）

1. **Global State (Context API)**:
   - `AuthContext`: UserSession, permissions
   - `AppContext`: theme, language, layout (既有)
   - `HeatPumpContext`: selectedDeviceId, dashboardFilters

2. **Server Cache (React Query)**:
   - `useQuery('devices')`: Device list
   - `useQuery(['device', deviceId])`: Single device detail
   - `useQuery(['historical', deviceId, timeRange])`: Historical data
   - `useMutation('sendCommand')`: Control command submission

3. **Local State (useState)**:
   - Form inputs (control panel, threshold editor)
   - UI toggles (sidebar collapse, chart legend visibility)
   - Temporary selections (date range picker)

### WebSocket Real-time Data Flow

```
Device → Backend WebSocket → Frontend WebSocket Hook → React Query Cache Invalidation → UI Re-render
```

實作細節見 `contracts/realtime-api.yaml` 和 `quickstart.md` WebSocket 範例。

---

## Database Initialization Script

```sql
-- Create database
CREATE DATABASE heatpump_dashboard;

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create all tables (按照上述 schema)
-- ...

-- Create default admin user (password: 'admin123', should be changed on first login)
INSERT INTO users (username, password_hash, display_name, role)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lP7G2Z0fH9HO',  -- bcrypt('admin123')
  'System Administrator',
  'admin'
);
```

---

## Next Steps

1. ✅ Data models defined
2. 📝 **Next**: Generate API contracts (`contracts/*.yaml`) based on these models
3. 📝 **Next**: Generate `quickstart.md` with setup instructions and code examples
4. 🔧 **Next**: Run `update-agent-context.ps1` to update AI agent context

---

## References

- [TimescaleDB Continuous Aggregates](https://docs.timescale.com/timescaledb/latest/how-to-guides/continuous-aggregates/) - Efficient historical data queries
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - Permission implementation
- [Pydantic Validators](https://docs.pydantic.dev/latest/concepts/validators/) - Business logic validation
- [React Query Data Synchronization](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching) - Server cache management
