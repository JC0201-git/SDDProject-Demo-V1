# 資料模型：熱泵遠端管理儀表板

**功能分支**: `001-heat-pump-remote-dashboard`  
**建立日期**: 2026年2月18日  
**狀態**: 完成  
**來源**: 從 [spec.md](spec.md) 功能需求「關鍵實體」章節提取

## 概述

本文件定義熱泵遠端管理儀表板的核心資料模型，包含實體屬性、關聯關係、驗證規則、以及狀態轉換邏輯。資料庫採用 **PostgreSQL 15 + TimescaleDB 擴展**，其中時序資料使用 TimescaleDB Hypertable，其他元資料使用標準 PostgreSQL 表格。

---

## 實體關聯圖 (Entity Relationship Diagram)

```
User (使用者)
│
├─► ControlCommand (控制指令) ─► Device (熱泵設備)
│                                  │
└─► ThresholdConfig (閥值配置) ◄───┤
                                   ├─► Component (元件)
                                   └─► DeviceMetrics (時序資料)
```

---

## 核心實體

### 1. User (使用者)

**表格**: `users`  
**用途**: 系統使用者，支援三級權限控制

#### 屬性

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | UUID | ✓ | Primary Key |
| `account` | VARCHAR(50) | ✓ | 登入帳號 (唯一) |
| `display_name` | VARCHAR(100) | ✓ | 顯示名稱 |
| `password_hash` | VARCHAR(255) | ✓ | bcrypt 雜湊密碼 |
| `role` | ENUM | ✓ | 權限等級: `viewer` / `operator` / `admin` |
| `email` | VARCHAR(255) |  | 電子郵件 (唯一) |
| `is_active` | BOOLEAN | ✓ | 帳號狀態 (預設: true) |
| `last_login_at` | TIMESTAMPTZ |  | 最後登入時間 |

#### 權限定義

| Role | 權限 |
|------|------|
| `viewer` | 唯讀：查看儀表板、裝置狀態、歷史趨勢 |
| `operator` | 查看 + 控制：可執行遠端控制，不可修改閥值 |
| `admin` | 完整權限：可修改閥值、管理使用者、查看操作紀錄 |

---

### 2. Device (熱泵設備)

**表格**: `devices`  
**用途**: 代表一台熱泵設備

#### 屬性

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | UUID | ✓ | Primary Key |
| `device_code` | VARCHAR(50) | ✓ | 裝置編號 (唯一，例如: HP-A-001) |
| `name` | VARCHAR(100) | ✓ | 裝置名稱 |
| `location` | VARCHAR(255) | ✓ | 安裝位置 |
| `status` | ENUM | ✓ | 運作狀態: `running` / `stopped` / `error` / `offline` |
| `operation_mode` | ENUM | ✓ | 運作模式: `auto` / `manual` |
| `connection_status` | ENUM | ✓ | 連線狀態: `online` / `offline` / `unstable` |
| `last_heartbeat_at` | TIMESTAMPTZ |  | 最後心跳時間 (用於判斷離線) |
| `installed_at` | DATE |  | 安裝日期 |

#### 狀態定義

| Status | 顯示 | 觸發條件 |
|--------|------|---------|
| `running` | 🟢 綠色 | 裝置正常運轉 |
| `stopped` | ⚪ 灰色 | 裝置已停止 |
| `error` | 🔴 紅色 | 參數超出閥值 |
| `offline` | ⚫ 黑色 | 超過 30 秒未收到心跳 |

---

### 3. Component (元件)

**表格**: `components`  
**用途**: 熱泵設備內的子元件 (風扇、幫浦、壓縮機等)

#### 屬性

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | UUID | ✓ | Primary Key |
| `device_id` | UUID | ✓ | Foreign Key → devices.id |
| `component_code` | VARCHAR(50) | ✓ | 元件編號 |
| `name` | VARCHAR(100) | ✓ | 元件名稱 (例如: 1號風扇) |
| `type` | ENUM | ✓ | 元件類型: `fan` / `pump` / `compressor` / `expansion_valve` / `heat_exchanger` |
| `status` | ENUM | ✓ | 運作狀態: `running` / `stopped` / `error` |

---

### 4. DeviceMetrics (時序資料)

**表格**: `device_metrics` (TimescaleDB Hypertable)  
**用途**: 儲存裝置的即時與歷史監測資料

#### 屬性

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `time` | TIMESTAMPTZ | ✓ | 資料時間戳記 (Hypertable 分割鍵) |
| `device_id` | UUID | ✓ | Foreign Key → devices.id |
| `metric_name` | VARCHAR(50) | ✓ | 參數名稱 (見下表) |
| `value` | DOUBLE PRECISION | ✓ | 參數數值 |
| `unit` | VARCHAR(20) | ✓ | 單位 (例如: °C, MPa, Hz) |
| `quality` | ENUM | ✓ | 資料品質: `normal` / `abnormal` / `missing` |

#### 參數定義

| metric_name | 中文名稱 | 單位 | 正常範圍 |
|-------------|---------|------|---------|
| `exhaust_temp` | 排氣溫度 | °C | 30-90 |
| `suction_temp` | 吸氣溫度 | °C | -10-30 |
| `refrigerant_pressure` | 冷媒壓力 | MPa | 0.5-3.0 |
| `tank_temp` | 水箱溫度 | °C | 10-85 |
| `target_temp` | 目標水溫 | °C | 40-80 |
| `compressor_freq` | 壓縮機頻率 | Hz | 20-120 |
| `power_consumption` | 瞬時耗電量 | kW | 0-50 |
| `heat_output` | 瞬時產熱量 | kW | 0-200 |
| `cop` | COP值 (能效比) | - | 2.0-5.0 |

#### TimescaleDB 配置

- **Chunk 間隔**: 7 天
- **資料保留**: 30 天後自動刪除
- **壓縮策略**: 7 天前資料自動壓縮 (節省 80% 空間)

---

### 5. ControlCommand (控制指令)

**表格**: `control_commands`  
**用途**: 記錄管理員送出的遠端控制指令

#### 屬性

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | UUID | ✓ | Primary Key |
| `device_id` | UUID | ✓ | Foreign Key → devices.id |
| `user_id` | UUID | ✓ | Foreign Key → users.id |
| `command_type` | ENUM | ✓ | 指令類型: `switch_mode` / `set_parameter` |
| `payload` | JSONB | ✓ | 指令內容 (JSON 格式) |
| `status` | ENUM | ✓ | 執行狀態: `pending` / `sent` / `confirmed` / `timeout` / `failed` |
| `error_message` | TEXT |  | 錯誤訊息 (若失敗) |
| `sent_at` | TIMESTAMPTZ | ✓ | 送出時間 |
| `confirmed_at` | TIMESTAMPTZ |  | 確認時間 (需在 3 秒內) |

#### Payload 格式

**切換模式**:
```json
{
  "target_mode": "manual"  // 或 "auto"
}
```

**設定參數**:
```json
{
  "parameter_name": "target_temp",
  "value": 55,
  "unit": "°C"
}
```

#### 狀態轉換

```
pending → sent → confirmed (成功)
              ├─→ timeout (3秒未回應)
              └─→ failed (執行失敗)
```

---

### 6. ThresholdConfig (閥值配置)

**表格**: `threshold_configs`  
**用途**: 儲存每台裝置各參數的異常閥值設定

#### 屬性

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | UUID | ✓ | Primary Key |
| `device_id` | UUID | ✓ | Foreign Key → devices.id |
| `metric_name` | VARCHAR(50) | ✓ | 參數名稱 |
| `min_value` | DOUBLE PRECISION | ✓ | 下限閥值 |
| `max_value` | DOUBLE PRECISION | ✓ | 上限閥值 |
| `is_default` | BOOLEAN | ✓ | 是否使用預設值 |
| `last_modified_by` | UUID |  | 最後修改者 ID (Foreign Key → users.id) |
| `last_modified_at` | TIMESTAMPTZ |  | 最後修改時間 |

**約束**: `(device_id, metric_name)` 唯一組合 + `min_value < max_value`

---

## 資料庫 Schema SQL

### 建立主要表格

```sql
-- 使用者表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'operator', 'admin')),
  email VARCHAR(255) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 裝置表
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'stopped', 'error', 'offline')),
  operation_mode VARCHAR(20) NOT NULL CHECK (operation_mode IN ('auto', 'manual')),
  connection_status VARCHAR(20) NOT NULL CHECK (connection_status IN ('online', 'offline', 'unstable')),
  last_heartbeat_at TIMESTAMPTZ,
  installed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 元件表
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  component_code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('fan', 'pump', 'compressor', 'expansion_valve', 'heat_exchanger')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'stopped', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 控制指令表
CREATE TABLE control_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  command_type VARCHAR(30) NOT NULL CHECK (command_type IN ('switch_mode', 'set_parameter')),
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'confirmed', 'timeout', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 閥值配置表
CREATE TABLE threshold_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  min_value DOUBLE PRECISION NOT NULL,
  max_value DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  last_modified_by UUID REFERENCES users(id),
  last_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, metric_name),
  CHECK (min_value < max_value)
);
```

### 建立 TimescaleDB Hypertable

```sql
-- 時序資料表
CREATE TABLE device_metrics (
  time TIMESTAMPTZ NOT NULL,
  device_id UUID NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(20) NOT NULL,
  quality VARCHAR(20) NOT NULL CHECK (quality IN ('normal', 'abnormal', 'missing')),
  PRIMARY KEY (time, device_id, metric_name)
);

-- 轉換為 Hypertable
SELECT create_hypertable('device_metrics', 'time', chunk_time_interval => INTERVAL '7 days');

-- 設定保留策略 (30 天)
SELECT add_retention_policy('device_metrics', INTERVAL '30 days');

-- 設定壓縮策略 (7 天)
ALTER TABLE device_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id'
);
SELECT add_compression_policy('device_metrics', INTERVAL '7 days');
```

---

## 效能優化

### 索引策略

```sql
-- Users
CREATE INDEX idx_users_role ON users(role);

-- Devices
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_connection ON devices(connection_status);

-- Components
CREATE INDEX idx_components_device ON components(device_id);
CREATE INDEX idx_components_device_type ON components(device_id, type);

-- DeviceMetrics
CREATE INDEX idx_metrics_device ON device_metrics(device_id, time DESC);

-- ControlCommands
CREATE INDEX idx_commands_device ON control_commands(device_id);
CREATE INDEX idx_commands_status ON control_commands(status);

-- ThresholdConfigs
CREATE INDEX idx_thresholds_device ON threshold_configs(device_id);
```

### 查詢優化範例

```sql
-- 長時間範圍聚合使用 time_bucket
SELECT 
  time_bucket('1 hour', time) AS hour,
  AVG(value) AS avg_value
FROM device_metrics
WHERE device_id = '[device-uuid]'
  AND metric_name = 'exhaust_temp'
  AND time > NOW() - INTERVAL '30 days'
GROUP BY hour
ORDER BY hour;
```

---

## 總結

✅ **完整性**: 涵蓋所有功能需求實體  
✅ **一致性**: 外鍵約束與驗證規則確保資料正確性  
✅ **效能**: TimescaleDB 時序優化 + 索引策略滿足即時查詢  
✅ **擴展性**: Schema 設計支援未來新增參數與功能  

**下一步**: 進入 Phase 1 - 設計 API 合約 (contracts/)
