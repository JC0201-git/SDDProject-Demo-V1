# 資料模型設計說明

**功能分支**: `002-heat-pump-remote-dashboard`  
**建立日期**: 2026年2月19日  
**資料庫**: PostgreSQL  
**ORM**: Prisma v5.8+

## 概述

本文件說明熱泵遠端監控儀表板的資料模型設計，包含 7 個核心實體與相關的列舉型別定義。資料模型設計遵循以下原則：

- **正規化設計**：避免資料重複，確保資料一致性
- **查詢最佳化**：針對常見查詢場景設計索引
- **時間序列特化**：針對遙測資料提供分區策略
- **資料生命週期管理**：明確定義資料保留策略與清理機制

## 實體關係圖（ERD）

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   User      │1       *│ ControlCommand  │*       1│ HeatPump     │
│             │─────────│                 │─────────│   Device     │
│ - username  │         │ - commandType   │         │ - deviceCode │
│ - password  │         │ - status        │         │ - status     │
│ - session   │         │ - commandContent│         │ - mode       │
└─────────────┘         └─────────────────┘         │ - parameters │
                                                     └──────┬───────┘
                                                            │1
                                   ┌────────────────────────┼────────────────────────┐
                                   │                        │                        │
                                   │*                       │*                       │*
                        ┌──────────┴──────┐    ┌───────────┴─────────┐   ┌─────────┴──────────┐
                        │  Component      │    │  TelemetryData      │   │  Notification      │
                        │                 │    │                     │   │                    │
                        │ - componentName │    │ - parameter         │   │ - eventType        │
                        │ - componentType │    │ - value             │   │ - severity         │
                        │ - status        │    │ - timestamp         │   │ - isRead           │
                        └─────────────────┘    │ - dataQuality       │   └────────────────────┘
                                               └─────────────────────┘
                                               
                        ┌─────────────────────┐
                        │  SafetyThreshold    │（獨立配置表）
                        │                     │
                        │ - parameter         │
                        │ - upperLimit        │
                        │ - lowerLimit        │
                        │ - severity          │
                        └─────────────────────┘
```

## 核心實體說明

### 1. User（使用者）

**用途**：管理系統登入的管理人員帳號與驗證資訊。

**關鍵欄位**：
- `username`：唯一的使用者帳號（UNIQUE 約束）
- `passwordHash`：使用 bcrypt 或 Argon2 加密的密碼雜湊值
- `displayName`：顯示於操作記錄的友善名稱（如「張經理」）
- `loginFailedCount` + `accountLockedUntil`：實作帳號鎖定機制（連續失敗 3 次鎖定 5 分鐘）
- `sessionToken` + `sessionExpiresAt`：Session 管理（8 小時有效期）

**安全考量**：
- 密碼欄位為 `passwordHash` 而非 `password`，強調不可儲存明文密碼
- `sessionToken` 設為 UNIQUE，確保每個使用者同時只有一個有效 Session
- 建議 Session Token 儲存於 HttpOnly Cookie，前端無法透過 JavaScript 存取

**關聯**：
- 一對多：一位使用者可執行多筆控制指令（`ControlCommand`）

---

### 2. HeatPumpDevice（熱泵設備）

**用途**：代表一台實體熱泵設備，儲存其即時狀態與運作參數。

**設計理念**：
- **即時參數快取**：將最新一筆資料直接儲存於設備表，避免每次查詢都需要掃描 `TelemetryData` 表（效能最佳化）
- **狀態欄位冗餘**：`status` 與 `operationMode` 直接儲存，方便快速篩選（全域儀表板只需查詢此表）

**關鍵欄位**：
- `deviceCode`：唯一識別碼（UNIQUE 約束），用於 MQTT Topic 路由
- `status`：運作狀態（NORMAL/ABNORMAL/OFFLINE），用於燈號顯示
- `operationMode`：運作模式（AUTO/MANUAL）
- 即時參數：`exhaustTemperature`、`highPressure`、`currentCOP` 等（對應 spec 的即時參數需求）
- `lastDataReceivedAt`：最後接收資料時間，用於離線偵測（超過 30 秒未更新視為離線）
- `lastControlledAt`：最後控制時間，用於速率限制（10 秒冷卻期）

**索引設計**：
- `status`：支援「查詢所有異常設備」場景
- `lastDataReceivedAt`：支援排程任務定期檢查離線設備

**關聯**：
- 一對多：一台設備有多個零件（`Component`）
- 一對多：一台設備有多筆遙測資料（`TelemetryData`）
- 一對多：一台設備產生多則通知（`Notification`）
- 一對多：一台設備接收多筆控制指令（`ControlCommand`）

---

### 3. Component（零件）

**用途**：代表設備內的子元件，如壓縮機、風扇、幫浦等。

**關鍵欄位**：
- `componentCode`：唯一識別碼（UNIQUE 約束）
- `componentType`：零件類型（ENUM：COMPRESSOR/FAN/CIRCULATION_PUMP 等）
- `status`：運作狀態（RUNNING/STOPPED/ABNORMAL）
- `deviceId`：外鍵，關聯至 `HeatPumpDevice`

**刪除行為**：
- `onDelete: Cascade`：當設備被刪除時，所有零件自動刪除

**索引設計**：
- `deviceId`：支援「查詢某設備的所有零件」場景
- `status`：支援「查詢所有異常零件」場景

**關聯**：
- 多對一：多個零件屬於一台設備（`HeatPumpDevice`）

---

### 4. SafetyThreshold（安全閾值）

**用途**：定義各監測參數的安全範圍，用於異常偵測。

**設計理念**：
- **全域單一配置**：每個參數只有一組閾值設定（`parameter` 為 UNIQUE）
- **支援單邊閾值**：`upperLimit` 與 `lowerLimit` 皆可為 NULL，例如「排氣溫度」只需要上限

**關鍵欄位**：
- `parameter`：參數名稱（ENUM：EXHAUST_TEMPERATURE/HIGH_PRESSURE 等）
- `upperLimit`：上限值（超過視為異常），可為 NULL
- `lowerLimit`：下限值（低於視為異常），可為 NULL
- `unit`：單位（如「°C」、「MPa」），用於前端顯示
- `severity`：異常嚴重程度（WARNING/ERROR），影響燈號與通知等級

**使用場景**：
- 後端接收設備資料後，立即比對此表設定，判斷是否超過閾值
- 前端顯示趨勢圖時，可標示閾值線（參考線）

**關聯**：
- 無外鍵關聯（獨立配置表）

---

### 5. Notification（通知訊息）

**用途**：記錄系統產生的異常事件通知，顯示於通知中心。

**關鍵欄位**：
- `eventType`：事件類型（ENUM：DEVICE_OFFLINE/TEMPERATURE_ABNORMAL 等）
- `severity`：嚴重程度（INFO/WARNING/ERROR），影響顯示樣式與排序優先級
- `deviceId`：關聯設備（外鍵）
- `title` + `description`：通知標題與詳細描述
- `occurredAt`：事件發生時間（NOT NULL，預設為當前時間）
- `isRead` + `readAt`：已讀狀態管理

**索引設計**（針對通知中心查詢最佳化）：
- `[deviceId, occurredAt DESC]`：查詢特定設備的通知歷史
- `[isRead, occurredAt DESC]`：查詢未讀通知（右上角紅點數字）
- `[occurredAt DESC]`：通知中心依時間排序
- `[createdAt]`：支援資料清理作業

**資料生命週期**：
- 保留期限：**7 天**（與遙測資料的 30 天不同）
- 清理邏輯：每日凌晨刪除 `createdAt < NOW() - INTERVAL '7 days'` 的記錄

**刪除行為**：
- `onDelete: Cascade`：當設備被刪除時，相關通知自動刪除

**關聯**：
- 多對一：多則通知關聯至一台設備（`HeatPumpDevice`）

---

### 6. TelemetryData（遙測資料）

**用途**：記錄設備在特定時間點的監測數值，用於趨勢圖分析。

**設計理念**：
- **時間序列資料特化**：採用窄表設計（每筆記錄只儲存一個參數），適合時間序列查詢
- **大量資料處理**：預期每台設備每 30 秒產生 10+ 個參數 = 每月約 86,000 筆/台設備

**關鍵欄位**：
- `deviceId` + `parameter` + `timestamp`：組成查詢關鍵（不是聯合主鍵，因為 `id` 為主鍵）
- `parameter`：參數類型（ENUM：EXHAUST_TEMPERATURE/HIGH_PRESSURE/COP 等）
- `value`：數值（Float）
- `dataQuality`：資料品質標記（NORMAL/ABNORMAL），用於過濾明顯錯誤的數值
- `timestamp`：資料時間戳記（用於趨勢圖橫軸）
- `createdAt`：建立時間（用於資料清理，與 `timestamp` 可能不同）

**索引設計**（針對趨勢圖查詢最佳化）：
- `[deviceId, parameter, timestamp DESC]`：查詢特定設備的特定參數趨勢（最常用）
- `[deviceId, timestamp DESC]`：查詢特定設備的所有參數
- `[timestamp]`：支援分區管理
- `[createdAt]`：支援資料清理作業

**分區策略（PostgreSQL）**：
```sql
-- 將 telemetry_data 轉換為分區表（依月份分割）
ALTER TABLE telemetry_data PARTITION BY RANGE (timestamp);

-- 建立 2026 年 2 月分區
CREATE TABLE telemetry_data_2026_02 PARTITION OF telemetry_data 
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 自動化建立下月分區（使用 pg_cron 或應用層排程）
```

**優點**：
- 查詢特定月份資料時，只掃描單一分區，效能大幅提升
- 刪除過期資料時，直接 `DROP PARTITION`，比逐筆刪除快數百倍
- 支援未來擴展至更大規模（數百台設備）

**資料生命週期**：
- 保留期限：**30 天**
- 清理邏輯：每日凌晨刪除 `createdAt < NOW() - INTERVAL '30 days'` 的記錄
- 建議使用分區刪除策略，而非逐筆刪除

**刪除行為**：
- `onDelete: Cascade`：當設備被刪除時，所有遙測資料自動刪除

**關聯**：
- 多對一：多筆遙測資料屬於一台設備（`HeatPumpDevice`）

---

### 7. ControlCommand（控制指令）

**用途**：記錄遠端控制操作，包含操作者、指令內容與執行狀態。

**關鍵欄位**：
- `id`：使用 UUID 而非自動遞增 ID，方便分散式系統追蹤
- `deviceId` + `userId`：記錄「誰對哪台設備執行操作」
- `commandType`：指令類型（ENUM：SET_MODE/SET_TARGET_TEMP/ADJUST_PARAMETER）
- `commandContent`：指令內容（JSON 格式），彈性儲存不同類型指令的參數
  - 範例：`{"mode": "manual"}` 或 `{"targetTemp": 60}`
- `status`：確認狀態（PENDING/ACKNOWLEDGED/TIMEOUT/FAILED）
- `sentAt` + `acknowledgedAt`：時間戳記，用於計算執行延遲
- `errorMessage`：失敗時的錯誤訊息

**索引設計**：
- `[deviceId, sentAt DESC]`：查詢特定設備的操作記錄（顯示最近 5 筆）
- `[userId, sentAt DESC]`：查詢特定使用者的操作記錄
- `[status, sentAt]`：查詢待確認的指令（用於超時檢測排程任務）
- `[createdAt]`：支援資料清理作業

**資料生命週期**：
- 保留期限：**30 天**（與遙測資料一致）
- 清理邏輯：與遙測資料清理作業一併執行

**刪除行為**：
- `onDelete: Cascade`：當設備或使用者被刪除時，相關控制指令自動刪除

**關聯**：
- 多對一：多筆指令關聯至一台設備（`HeatPumpDevice`）
- 多對一：多筆指令關聯至一位使用者（`User`）

---

## 列舉型別（Enum）設計

Prisma Schema 定義了 11 個列舉型別，提供以下優點：

- **型別安全**：編譯時期檢查，避免無效值
- **可讀性**：使用語義化名稱（如 `ABNORMAL` 而非數字代碼）
- **資料庫約束**：PostgreSQL 會建立對應的 ENUM 類型，確保資料完整性

### 列舉清單

| 列舉名稱 | 用途 | 可能值 |
|---------|------|--------|
| `DeviceStatus` | 設備運作狀態 | NORMAL, ABNORMAL, OFFLINE |
| `OperationMode` | 設備運作模式 | AUTO, MANUAL |
| `ComponentStatus` | 零件運作狀態 | RUNNING, STOPPED, ABNORMAL |
| `ComponentType` | 零件類型 | COMPRESSOR, FAN, CIRCULATION_PUMP, EXPANSION_VALVE, WATER_TANK, OTHER |
| `NotificationEventType` | 通知事件類型 | DEVICE_OFFLINE, TEMPERATURE_ABNORMAL, PRESSURE_ABNORMAL, COMPONENT_FAILURE, OTHER_ABNORMAL |
| `NotificationSeverity` | 通知嚴重程度 | INFO, WARNING, ERROR |
| `TelemetryParameterType` | 遙測參數類型 | EXHAUST_TEMPERATURE, SUCTION_TEMPERATURE, WATER_IN_TEMPERATURE, WATER_OUT_TEMPERATURE, WATER_TANK_TEMPERATURE, HIGH_PRESSURE, LOW_PRESSURE, COMPRESSOR_FREQUENCY, POWER_CONSUMPTION, HEAT_OUTPUT, COP |
| `DataQuality` | 資料品質標記 | NORMAL, ABNORMAL |
| `ControlCommandType` | 控制指令類型 | SET_MODE, SET_TARGET_TEMP, ADJUST_PARAMETER |
| `ControlCommandStatus` | 控制指令狀態 | PENDING, ACKNOWLEDGED, TIMEOUT, FAILED |
| `ThresholdParameter` | 閾值參數名稱 | EXHAUST_TEMPERATURE, HIGH_PRESSURE, LOW_PRESSURE, WATER_TANK_TEMPERATURE, COMPRESSOR_FREQUENCY |
| `ThresholdSeverity` | 閾值嚴重程度 | WARNING, ERROR |

---

## 索引策略（Index Strategy）

### 索引設計原則

1. **查詢場景導向**：根據 spec.md 的使用者故事設計索引
2. **複合索引優先**：針對多欄位查詢建立複合索引（注意欄位順序）
3. **避免過度索引**：索引會降低寫入效能，僅針對高頻查詢建立

### 關鍵索引說明

| 表名 | 索引欄位 | 用途 |
|------|---------|------|
| `users` | `username` (UNIQUE) | 登入驗證查詢 |
| `users` | `sessionToken` (UNIQUE) | Session 驗證查詢 |
| `heat_pump_devices` | `deviceCode` (UNIQUE) | 依設備編號查詢 |
| `heat_pump_devices` | `status` | 全域儀表板查詢異常設備 |
| `heat_pump_devices` | `lastDataReceivedAt` | 離線偵測排程任務 |
| `components` | `deviceId` | 查詢設備的所有零件 |
| `components` | `status` | 查詢所有異常零件 |
| `notifications` | `[deviceId, occurredAt DESC]` | 查詢特定設備的通知歷史 |
| `notifications` | `[isRead, occurredAt DESC]` | 查詢未讀通知（紅點數字） |
| `telemetry_data` | `[deviceId, parameter, timestamp DESC]` | 趨勢圖查詢（最重要） |
| `control_commands` | `[deviceId, sentAt DESC]` | 查詢設備的操作記錄 |

---

## 資料生命週期管理

### 保留期限

| 表名 | 保留期限 | 原因 |
|------|---------|------|
| `users` | 永久 | 使用者帳號資料 |
| `heat_pump_devices` | 永久 | 設備基本資料 |
| `components` | 永久 | 零件基本資料 |
| `safety_thresholds` | 永久 | 配置資料 |
| `notifications` | **7 天** | 通知歷史，短期參考即可 |
| `telemetry_data` | **30 天** | 遙測資料，平衡儲存成本與分析需求 |
| `control_commands` | **30 天** | 操作記錄，稽核用途 |

### 清理策略

**方案 A：PostgreSQL pg_cron 擴充功能**

```sql
-- 安裝 pg_cron 擴充功能
CREATE EXTENSION pg_cron;

-- 排程每日凌晨 3:00 執行清理
SELECT cron.schedule('cleanup-old-data', '0 3 * * *', $$
  DELETE FROM telemetry_data WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM control_commands WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days';
$$);
```

**方案 B：應用層排程（Node.js + node-cron）**

```typescript
import cron from 'node-cron';
import { prisma } from './prisma';

// 每日凌晨 3:00 執行
cron.schedule('0 3 * * *', async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await prisma.telemetryData.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } }
  });

  await prisma.controlCommand.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } }
  });

  await prisma.notification.deleteMany({
    where: { createdAt: { lt: sevenDaysAgo } }
  });

  console.log('[CLEANUP] Old data deleted successfully');
});
```

**建議**：若使用分區表，建議直接刪除整個分區，效能更好：

```sql
-- 刪除超過 30 天的分區（假設每月一個分區）
DROP TABLE IF EXISTS telemetry_data_2025_12;
```

---

## 效能最佳化建議

### 1. 連線池管理

```typescript
// prisma/client.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
});

// 或使用 PgBouncer 管理連線池
```

### 2. 查詢最佳化範例

```typescript
// ❌ 不良寫法：N+1 查詢問題
const devices = await prisma.heatPumpDevice.findMany();
for (const device of devices) {
  const components = await prisma.component.findMany({
    where: { deviceId: device.id }
  });
}

// ✅ 良好寫法：使用 include 減少查詢次數
const devices = await prisma.heatPumpDevice.findMany({
  include: {
    components: true,
  }
});
```

### 3. 批次寫入最佳化

```typescript
// ✅ 使用 createMany 批次插入遙測資料
await prisma.telemetryData.createMany({
  data: telemetryPoints, // 陣列
  skipDuplicates: true,
});
```

### 4. 定期維護

```sql
-- 每週執行 VACUUM ANALYZE，維護資料庫效能
VACUUM ANALYZE telemetry_data;
VACUUM ANALYZE control_commands;

-- 監控索引使用率（找出未使用的索引）
SELECT 
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey';
```

---

## 初始化與遷移

### 1. 安裝依賴

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### 2. 初始化 Prisma

```bash
npx prisma init
```

### 3. 設定環境變數

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/heat_pump_dashboard?schema=public"
```

### 4. 執行遷移

```bash
# 開發環境：建立遷移並套用
npx prisma migrate dev --name init

# 生產環境：僅套用遷移
npx prisma migrate deploy
```

### 5. 產生 Prisma Client

```bash
npx prisma generate
```

### 6. 插入初始資料

```typescript
// prisma/seed.ts
import { prisma } from './client';

async function main() {
  // 建立安全閾值設定
  await prisma.safetyThreshold.createMany({
    data: [
      {
        parameter: 'EXHAUST_TEMPERATURE',
        upperLimit: 85,
        unit: '°C',
        severity: 'ERROR',
        description: '排氣溫度超過 85°C 可能導致壓縮機損壞',
      },
      {
        parameter: 'HIGH_PRESSURE',
        upperLimit: 3.5,
        unit: 'MPa',
        severity: 'ERROR',
        description: '高壓壓力超過 3.5 MPa 可能導致系統破裂',
      },
      {
        parameter: 'LOW_PRESSURE',
        lowerLimit: 0.3,
        unit: 'MPa',
        severity: 'WARNING',
        description: '低壓壓力低於 0.3 MPa 可能表示冷媒不足',
      },
    ],
  });

  // 建立測試使用者
  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: '$2b$10$...', // 實際應使用 bcrypt.hash()
      displayName: '系統管理員',
    },
  });

  console.log('✅ 初始資料插入完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

執行種子腳本：

```bash
npx prisma db seed
```

---

## 安全性考量

### 1. 密碼儲存

```typescript
import bcrypt from 'bcrypt';

// 註冊時加密密碼
const saltRounds = 10;
const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

await prisma.user.create({
  data: {
    username,
    passwordHash,
    displayName,
  },
});

// 登入時驗證密碼
const user = await prisma.user.findUnique({ where: { username } });
const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
```

### 2. Session 管理

```typescript
import { randomUUID } from 'crypto';

// 建立 Session
const sessionToken = randomUUID();
const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 小時

await prisma.user.update({
  where: { id: userId },
  data: {
    sessionToken,
    sessionExpiresAt,
  },
});

// 驗證 Session
const user = await prisma.user.findFirst({
  where: {
    sessionToken,
    sessionExpiresAt: { gt: new Date() }, // Session 尚未過期
  },
});

if (!user) {
  throw new Error('Session 無效或已過期');
}
```

### 3. SQL Injection 防護

Prisma 使用參數化查詢，自動防止 SQL Injection。但使用原始查詢時需注意：

```typescript
// ❌ 危險：直接拼接字串
await prisma.$queryRaw`SELECT * FROM users WHERE username = '${username}'`;

// ✅ 安全：使用參數化查詢
await prisma.$queryRaw`SELECT * FROM users WHERE username = ${username}`;
```

---

## 未來擴展建議

### 1. 角色權限控制（RBAC）

當系統需要區分「管理員」與「一般操作員」時，可擴展 User 模型：

```prisma
enum UserRole {
  ADMIN
  OPERATOR
  VIEWER
}

model User {
  // ... 現有欄位
  role     UserRole @default(VIEWER)
}
```

### 2. 多租戶支援（Multi-tenancy）

當系統需要服務多個組織時（如 A 公司、B 公司），可新增 Organization 模型：

```prisma
model Organization {
  id          Int       @id @default(autoincrement())
  name        String
  users       User[]
  devices     HeatPumpDevice[]
}

model User {
  // ... 現有欄位
  orgId       Int
  organization Organization @relation(fields: [orgId], references: [id])
}
```

### 3. 設備群組管理

當設備數量增加至數百台時，可新增群組功能：

```prisma
model DeviceGroup {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  devices     HeatPumpDevice[]
}

model HeatPumpDevice {
  // ... 現有欄位
  groupId     Int?
  group       DeviceGroup? @relation(fields: [groupId], references: [id])
}
```

### 4. 時間序列資料庫遷移

當資料量成長至億級規模時，考慮使用專用的時間序列資料庫：

- **InfluxDB**：開源時間序列資料庫，專為 IoT 場景設計
- **TimescaleDB**：PostgreSQL 的時間序列擴充功能，相容性好
- **QuestDB**：高效能時間序列資料庫，支援 SQL 查詢

遷移策略：將 `TelemetryData` 遷移至時間序列資料庫，保留其他表於 PostgreSQL。

---

## 常見問題（FAQ）

### Q1：為什麼 `TelemetryData` 使用窄表設計，而非寬表？

**A**：窄表（每筆記錄一個參數）更適合時間序列資料：
- **彈性擴展**：新增參數類型不需修改表結構
- **查詢效能**：查詢特定參數時，只掃描相關記錄
- **分區友善**：時間序列資料庫通常採用窄表設計

寬表（每筆記錄包含所有參數）的缺點：
- 新增參數需要 `ALTER TABLE`（生產環境風險高）
- 查詢單一參數仍需載入整列資料
- 稀疏資料浪費儲存空間

### Q2：為什麼 `HeatPumpDevice` 同時儲存即時參數與 `TelemetryData`？

**A**：這是效能與正規化的權衡：
- `HeatPumpDevice` 的即時參數是**快取**，避免每次查詢全域儀表板都需要掃描 `TelemetryData`
- `TelemetryData` 是**完整歷史記錄**，用於趨勢圖分析
- 更新策略：後端收到新資料時，同時更新兩張表

### Q3：為什麼通知保留 7 天，但遙測資料保留 30 天？

**A**：基於實際使用場景：
- **通知**：短期參考即可（類似訊息中心），7 天後的通知價值不大
- **遙測資料**：需要較長時間趨勢分析（如月度效能報表），30 天平衡儲存成本

### Q4：如何處理 MQTT 訊息與資料庫的同步問題？

**A**：建議架構：
1. MQTT Client 訂閱設備資料
2. 收到訊息後，先插入 `TelemetryData`（歷史記錄）
3. 再更新 `HeatPumpDevice`（即時快取）
4. 透過 WebSocket 推送至前端

使用佇列（如 Redis Streams）緩衝訊息，避免資料庫寫入瓶頸。

### Q5：如何實作「10 秒控制指令冷卻期」？

**A**：使用 `lastControlledAt` 欄位：

```typescript
const device = await prisma.heatPumpDevice.findUnique({
  where: { id: deviceId }
});

const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

if (device.lastControlledAt && device.lastControlledAt > tenSecondsAgo) {
  const remainingSeconds = Math.ceil(
    (device.lastControlledAt.getTime() + 10000 - Date.now()) / 1000
  );
  throw new Error(`此設備剛完成操作，請等待 ${remainingSeconds} 秒後再試`);
}

// 執行控制指令，並更新 lastControlledAt
await prisma.heatPumpDevice.update({
  where: { id: deviceId },
  data: { lastControlledAt: new Date() }
});
```

---

## 相關文件

- [功能規格書](./spec.md)
- [Prisma Schema](./schema.prisma)
- [研究筆記](./research.md)
- [開發計畫](./plan.md)

---

**版本歷史**

- v1.0（2026-02-19）：初始版本，包含 7 個核心實體與完整索引設計
