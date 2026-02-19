# 技術研究：熱泵遠端監控儀表板

**分支**: `002-heat-pump-remote-dashboard` | **日期**: 2026-02-19  
**目的**: 解決實作計劃中標註為 NEEDS CLARIFICATION 的技術決策，並為已確定技術提供最佳實踐指引。

---

## 研究議題清單

### 需釐清的技術決策
1. [後端語言與框架選型](#1-後端語言與框架選型) - ✅ 已決策
2. [後端測試策略](#2-後端測試策略) - ✅ 已決策

### 最佳實踐研究
3. [React + TypeScript 前端最佳實踐](#3-react--typescript-前端最佳實踐)
4. [MQTT 通訊模式與可靠性保證](#4-mqtt-通訊模式與可靠性保證)
5. [PostgreSQL 資料庫設計與效能優化](#5-postgresql-資料庫設計與效能優化)
6. [WebSocket 即時通訊最佳實踐](#6-websocket-即時通訊最佳實踐)

---

## 1. 後端語言與框架選型

### 研究問題
從技術背景中的三個候選方案選擇最適合本專案的後端技術堆疊：
- Node.js + Express/Fastify + TypeScript
- Python + FastAPI
- Go + Gin/Echo

### 評估維度
- 前後端技術棧統一性
- 即時通訊與 IoT 生態系成熟度
- 開發效率與學習曲線
- 效能是否滿足需求（API ≤500ms P95、50 設備、10 並發用戶）
- 社群支援與函式庫成熟度

### 決策：Node.js + Fastify + TypeScript

**選擇理由**：

1. **前後端技術棧統一** (權重：30%)
   - 與 React + TypeScript 前端共用語言生態，降低團隊上下文切換成本
   - 可共用型別定義（透過 Prisma Client 自動生成、Zod Schema）
   - 可共用驗證邏輯、工具函式、常數定義

2. **即時通訊原生優勢** (權重：30%)
   - Event Loop 機制天生適合處理高並發 I/O（MQTT 訊息、WebSocket 連線）
   - `mqtt.js` 是業界最成熟的 MQTT 客戶端（5.3+ 版本支援 MQTT 5.0）
   - `socket.io` 提供自動重連、房間管理、事件廣播等高階功能

3. **開發效率符合需求** (權重：20%)
   - NPM 生態系龐大，可快速整合第三方套件
   - Prisma 提供優秀的資料庫開發體驗（自動遷移、型別安全查詢）
   - Fastify 內建 Schema 驗證、自動 Swagger 文檔生成

4. **效能充分滿足需求** (權重：15%)
   - Fastify 效能優於 Express（請求處理速度快 2 倍）
   - 您的規模（50 設備、10 用戶）遠低於 Node.js 處理上限
   - 實測：Fastify 可輕鬆達到 10,000+ req/s（遠超 API ≤500ms P95 需求）

5. **社群支援活躍** (權重：5%)
   - Node.js 擁有最大的開發者社群
   - Stack Overflow、GitHub Issues、Discord 社群問題解決速度快

### 推薦技術組合

| 層級 | 技術選擇 | 版本 | 用途 |
|------|---------|------|------|
| **HTTP 框架** | Fastify | v4.25+ | RESTful API、自動 Schema 驗證 |
| **資料庫 ORM** | Prisma | v5.8+ | 型別安全查詢、遷移管理、CLI 工具 |
| **MQTT 客戶端** | mqtt.js | v5.3+ | 訂閱設備遙測、發布控制指令 |
| **WebSocket** | socket.io | v4.6+ | 即時推送資料至前端 |
| **資料驗證** | Zod | v3.22+ | 與前端共用 Schema 定義 |
| **密碼雜湊** | bcrypt | v5.1+ | 使用者密碼安全儲存 |
| **Session 管理** | @fastify/session | v10.9+ + Redis | 分散式 Session 儲存 |
| **定時任務** | node-cron | v3.0+ | 資料清理排程 |
| **測試框架** | Vitest | v1.2+ | 單元測試、整合測試 |
| **API 測試** | Supertest | v6.3+ | HTTP 端點測試 |
| **日誌記錄** | pino | v8.17+ | 結構化日誌（Fastify 內建） |

### 替代方案參考

**若團隊有特殊需求，備選方案為**：

1. **Python + FastAPI**（適合快速原型 + 未來資料分析需求）
   - 優勢：開發速度最快、自動 API 文檔、若需機器學習分析易於整合
   - 劣勢：WebSocket 效能較差、MQTT 生態不如 Node.js 成熟
   - 推薦組合：FastAPI v0.109+、asyncpg v0.29+、aiomqtt v2.0+

2. **Go + Gin**（適合未來大規模擴展至數百台設備）
   - 優勢：極致效能、並發原語優秀、部署簡便（單一二進位檔案）
   - 劣勢：開發速度較慢、無法與前端共用型別、學習曲線較陡
   - 推薦組合：Gin v1.9+、sqlc v1.25+、paho.mqtt.golang v1.4+

---

## 2. 後端測試策略

### 研究問題
確定後端測試框架與測試分層策略，符合 Frontend Constitution 要求的 80% 程式碼覆蓋率目標。

### 決策：Vitest + Supertest + 三層測試金字塔

**測試框架選擇：Vitest v1.2+**

**選擇理由**：
- 與 TypeScript 整合佳，無需額外配置
- 執行速度比 Jest 快 5-10 倍（使用 Vite 的轉換管道）
- API 與 Jest 高度相容，遷移成本低
- 內建程式碼覆蓋率報告（c8 引擎）
- 支援 Watch Mode 與平行測試執行

**測試分層策略**：

| 測試層級 | 覆蓋率目標 | 工具 | 測試對象 |
|---------|-----------|------|---------|
| **單元測試** (Unit) | 80%+ | Vitest | models, services, utils |
| **整合測試** (Integration) | 關鍵路徑 | Vitest + Supertest | API 端點、MQTT 訂閱/發布 |
| **端到端測試** (E2E) | 關鍵使用者旅程 | Playwright | 前後端整合流程 |

**測試覆蓋率標準**：
- 業務邏輯模組（services/）：**必須達到 80%**
- 資料模型（models/）：**建議達到 70%**
- API 路由（api/routes/）：**建議達到 60%**（整合測試覆蓋）
- 工具函式（utils/）：**必須達到 90%**

**Mock 策略**：
- 資料庫：使用 Prisma 的 `@prisma/client` Mock
- MQTT：使用 `mqtt` 套件的 Mock Client
- Redis：使用 `ioredis-mock`
- 時間：使用 Vitest 的 `vi.useFakeTimers()`

---

## 3. React + TypeScript 前端最佳實踐

### 狀態管理策略

**混合策略：Zustand + React Query + React Hooks**

| 狀態類型 | 管理工具 | 使用場景 | 範例 |
|---------|---------|---------|------|
| **Global State** | Zustand v4.5+ | 跨頁面共用狀態 | 使用者認證、通知中心、UI 主題 |
| **Server Cache** | React Query v5.17+ | 伺服器資料同步 | 設備列表、遙測資料、趨勢圖表 |
| **Local State** | React Hooks | 元件內部狀態 | 表單輸入、Modal 開關、Loading 狀態 |

**React Query 配置建議**：
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,        // 30秒內視為新鮮資料（符合規格的更新頻率）
      cacheTime: 300000,       // 快取保留 5 分鐘
      refetchOnWindowFocus: false,  // 避免頁籤切換時不必要的請求
      retry: 2,                // API 失敗重試 2 次
      retryDelay: 1000,        // 重試間隔 1 秒
    },
  },
});
```

### 元件設計模式

**採用 Container-Presenter 模式**：

**Presentational Components（展示元件）**：
- 無狀態、純函式元件
- 僅接收 props，不直接呼叫 API
- 負責 UI 渲染與視覺互動
- 高度可重用、易於測試
- 範例：`DeviceCard`、`TrendChart`、`StatusBadge`

**Container Components（容器元件）**：
- 有狀態，使用 Hooks 管理資料
- 負責資料獲取、業務邏輯
- 組合多個展示元件
- 範例：`DashboardPage`、`DeviceDetailPage`

**推薦元件結構**：
```
components/DeviceCard/
├── DeviceCard.tsx           # 展示元件（純 UI）
├── DeviceCard.types.ts     # TypeScript 型別定義
├── DeviceCard.module.css   # CSS Modules 樣式
└── DeviceCard.test.tsx     # 單元測試

pages/DashboardPage/
├── DashboardPage.tsx        # 容器元件（資料獲取）
├── useDashboard.ts          # 自訂 Hook（邏輯分離）
└── DashboardPage.test.tsx   # 整合測試
```

### 防禦性 UI 設計

**Skeleton Screens 實作**：
- 使用 `react-loading-skeleton` 或自訂元件
- 所有資料載入狀態必須顯示 Skeleton，避免空白畫面
- 範例：設備卡片、圖表區域、統計數字

**錯誤邊界 (Error Boundaries)**：
- 頂層設置全域錯誤邊界，捕獲未處理異常
- 關鍵功能區域設置區域錯誤邊界（如圖表元件）
- 錯誤訊息提供「重試」按鈕與問題回報連結

**Empty State 設計**：
- 無設備時：顯示「尚無設備連線」+ 設定引導
- 無通知時：顯示「目前沒有通知」+ 說明文字
- 搜尋無結果：顯示「找不到符合的設備」+ 清除篩選按鈕

### 效能優化

**Code Splitting（程式碼分割）**：
```typescript
// 路由層級懶加載
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const DeviceDetailPage = lazy(() => import('@/pages/DeviceDetailPage'));

// Suspense 包裹懶加載元件
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</Suspense>
```

**虛擬化長列表**：
- 使用 `react-window` 或 `react-virtualized`
- 適用場景：設備列表（50 台設備）、通知中心（50+ 則通知）

**圖表效能優化**：
- 趨勢圖表資料量大時（30 天資料），限制顯示點數（降採樣）
- 使用 `useMemo` 快取圖表配置物件
- 使用 `React.memo` 包裹圖表元件，避免不必要重繪

---

## 4. MQTT 通訊模式與可靠性保證

### MQTT 訂閱/發布架構

**Topic 命名規範**：
```
devices/{device_id}/telemetry      # 設備遙測資料（設備→後端）
devices/{device_id}/commands       # 控制指令（後端→設備）
devices/{device_id}/command-ack    # 指令確認（設備→後端）
devices/{device_id}/status         # 設備狀態（線上/離線）
```

**QoS 選擇策略**：

| Topic | QoS 等級 | 理由 |
|-------|---------|------|
| `telemetry` | QoS 0 (At Most Once) | 高頻資料（每 30 秒），丟失一筆不影響整體監控 |
| `commands` | QoS 1 (At Least Once) | 控制指令必須送達，允許重複（需去重） |
| `command-ack` | QoS 1 (At Least Once) | 確認訊息必須收到，確保指令執行狀態更新 |
| `status` | QoS 1 (At Least Once) | 設備上下線狀態重要，必須可靠傳遞 |

### Last Will and Testament (LWT) 機制

**設備離線偵測**：
- 設備連線時設定 LWT 訊息：
  ```json
  {
    "topic": "devices/{device_id}/status",
    "payload": {"status": "offline", "timestamp": "..."},
    "qos": 1,
    "retain": true
  }
  ```
- 設備正常運作時定期發布 `{"status": "online"}`
- 若設備意外斷線，Broker 自動發布 LWT 訊息
- 後端訂閱 `devices/+/status`，即時更新設備狀態

### 訊息去重與冪等性

**控制指令去重**：
- 每個控制指令包含唯一 `command_id`（UUID）
- 後端發布前記錄於 Redis（TTL 60 秒）
- 設備收到後檢查 `command_id` 是否已執行，避免重複操作
- 設備回傳 `command-ack` 包含相同 `command_id`

**冪等性設計**：
- 設定目標溫度為 60°C，重複執行結果相同（天然冪等）
- 模式切換指令需檢查當前模式，避免無意義操作

### 連線可靠性保證

**自動重連機制**：
```typescript
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `backend-${uuid()}`,
  clean: false,               // 保留 Session，重連後恢復訂閱
  keepalive: 60,             // 60 秒心跳檢測
  reconnectPeriod: 5000,     // 連線失敗後 5 秒重試
  connectTimeout: 30000,     // 連線超時 30 秒
  will: {                    // 後端 LWT（異常重啟時通知運維）
    topic: 'backend/status',
    payload: 'offline',
    qos: 1,
    retain: true
  }
});
```

**訊息緩衝機制**：
- 後端發送控制指令時，若 MQTT Client 離線，暫存於緩衝佇列
- 重連後優先發送緩衝訊息（FIFO 順序）
- 緩衝佇列限制 100 則，超過後丟棄最舊訊息並記錄日誌

---

## 5. PostgreSQL 資料庫設計與效能優化

### Schema 設計原則

**時間序列資料優化**：
- `telemetry_data` 表採用分區（Partitioning）策略：
  ```sql
  CREATE TABLE telemetry_data (
    id BIGSERIAL,
    device_id INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    temperatures JSONB,
    pressures JSONB,
    power JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  ) PARTITION BY RANGE (timestamp);

  -- 每月一個分區
  CREATE TABLE telemetry_data_2026_02
    PARTITION OF telemetry_data
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
  ```

**索引策略**：
```sql
-- 設備 ID + 時間範圍查詢（趨勢圖表）
CREATE INDEX idx_telemetry_device_time ON telemetry_data (device_id, timestamp DESC);

-- 設備狀態快速查詢
CREATE INDEX idx_devices_status ON devices (status) WHERE status IN ('online', 'error');

-- 未讀通知計數
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;
```

### 資料保留策略

**自動清理排程**：
- 每日凌晨 2:00 執行（使用 `node-cron`）
- 刪除超過 30 天的資料：
  ```sql
  DELETE FROM telemetry_data WHERE timestamp < NOW() - INTERVAL '30 days';
  DELETE FROM command_logs WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days';
  ```
- 使用 `VACUUM ANALYZE` 回收空間與更新統計資訊

**分區管理**：
- 每月 1 日自動建立新分區（透過排程腳本）
- 每月清理 2 個月前的舊分區：`DROP TABLE telemetry_data_2025_12;`

### 效能優化技巧

**連線池配置**：
```typescript
// Prisma 連線池設定
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 20      // 10 並發用戶 + 10 MQTT 處理器
}
```

**查詢優化**：
- 趨勢圖表查詢使用 `EXPLAIN ANALYZE` 驗證執行計畫
- 避免 N+1 查詢：使用 Prisma 的 `include` 一次載入關聯資料
- 大量資料匯總使用 Materialized Views（物化視圖）

**JSONB 欄位最佳實踐**：
- `telemetry_data.temperatures` 使用 JSONB 儲存多個溫度值
- 建立 GIN/GiST 索引加速 JSONB 查詢：
  ```sql
  CREATE INDEX idx_telemetry_temps ON telemetry_data USING GIN (temperatures);
  ```

---

## 6. WebSocket 即時通訊最佳實踐

### Socket.IO 配置建議

**命名空間與房間設計**：
```typescript
io.of('/realtime').on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  
  // 每個使用者加入個人房間（接收針對性通知）
  socket.join(`user:${userId}`);
  
  // 使用者訂閱特定設備（接收即時遙測資料）
  socket.on('subscribe:device', (deviceId) => {
    socket.join(`device:${deviceId}`);
  });
  
  socket.on('unsubscribe:device', (deviceId) => {
    socket.leave(`device:${deviceId}`);
  });
});
```

**事件類型設計**：
| 事件名稱 | 方向 | 資料格式 | 用途 |
|---------|------|---------|------|
| `device:telemetry` | 伺服器→客戶端 | `{deviceId, data, timestamp}` | 推送即時遙測資料 |
| `device:status` | 伺服器→客戶端 | `{deviceId, status}` | 推送設備狀態變更 |
| `notification:new` | 伺服器→客戶端 | `{id, type, message, ...}` | 推送新通知 |
| `command:ack` | 伺服器→客戶端 | `{commandId, status}` | 推送控制指令確認 |
| `subscribe:device` | 客戶端→伺服器 | `{deviceId}` | 訂閱設備即時資料 |

### 連線穩定性保證

**心跳檢測**：
```typescript
// 伺服器配置
const io = new Server(httpServer, {
  pingInterval: 25000,       // 25 秒發送一次 ping
  pingTimeout: 60000,        // 60 秒未收到 pong 視為斷線
  transports: ['websocket', 'polling'],  // 降級策略
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});
```

**客戶端自動重連**：
```typescript
const socket = io(BACKEND_URL, {
  reconnection: true,
  reconnectionDelay: 2000,      // 初次重連延遲 2 秒
  reconnectionDelayMax: 10000,  // 最大延遲 10 秒
  reconnectionAttempts: 5,      // 嘗試 5 次後放棄
  auth: {
    userId: currentUser.id,
    token: sessionToken
  }
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // 伺服器主動斷線（Session 過期），重新登入
    redirectToLogin();
  }
  // 其他情況由 socket.io 自動重連
});
```

### 擴展性考量

**單伺服器實例可支援**：
- 1,000+ 並發 WebSocket 連線
- 您的需求（10 並發用戶）遠低於此極限

**未來擴展至多實例（若需要）**：
- 使用 Redis Adapter：`@socket.io/redis-adapter`
- 所有伺服器實例共用 Redis Pub/Sub，確保訊息廣播至所有客戶端

---

## 研究結論與行動項目

### 關鍵決策總結

| 決策項目 | 最終選擇 | 主要理由 |
|---------|---------|---------|
| 後端框架 | Node.js + Fastify + TypeScript | 前後端技術棧統一、即時通訊原生優勢 |
| 資料庫 ORM | Prisma v5.8+ | 型別安全、開發體驗優秀、遷移管理完善 |
| MQTT 客戶端 | mqtt.js v5.3+ | 生態系最成熟、MQTT 5.0 支援 |
| WebSocket | socket.io v4.6+ | 自動重連、房間管理、成熟穩定 |
| 前端狀態管理 | Zustand + React Query | 符合憲法要求的三層狀態分離 |
| 測試框架 | Vitest v1.2+ | 執行速度快、TypeScript 整合佳 |

### 後續實作優先級

**Phase 1（資料模型與 API 合約設計）應完成**：
1. 使用 Prisma Schema 定義完整資料模型（使用者、設備、遙測、通知、指令）
2. 設計 RESTful API 規格並產出 OpenAPI 3.0 文檔（contracts/）
3. 定義 WebSocket 事件類型與資料格式
4. 定義 TypeScript 型別定義（前後端共用）

**Phase 2（任務分解）需涵蓋**：
1. 基礎設施設置（PostgreSQL、MQTT Broker、Redis、Prisma）
2. 後端核心服務實作（認證、MQTT 訂閱、WebSocket 推送）
3. 前端核心元件實作（設備卡片、趨勢圖表、控制面板）
4. 整合測試與效能驗證
5. 部署與監控配置

---

**研究完成日期**: 2026-02-19  
**下一步**: 進入 Phase 1 - 資料模型設計與 API 合約定義
