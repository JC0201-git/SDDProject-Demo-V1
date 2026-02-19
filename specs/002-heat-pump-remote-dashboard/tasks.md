# 任務清單：熱泵遠端監控儀表板

**輸入**: 設計文件來自 `/specs/002-heat-pump-remote-dashboard/`  
**前置需求**: plan.md, spec.md, research.md, data-model.md, contracts/

**測試策略**: 此專案**不包含**測試任務（規格中未明確要求 TDD 方法）。測試將在後續版本或依需求加入。

**組織原則**: 任務依使用者故事分組，使每個故事可以獨立實作與測試。

## 格式說明：`[ID] [P?] [Story] 描述`

- **[P]**: 可平行執行（不同檔案、無相依性）
- **[Story]**: 此任務所屬的使用者故事（如 US1, US2, US3）
- 所有描述皆包含精確的檔案路徑

## 路徑約定

本專案採用 **Web 應用雙端架構**：
- 後端：`backend/src/`
- 前端：`frontend/src/`
- 測試：`backend/tests/`, `frontend/tests/`

---

## Phase 1: 專案初始化 (Setup)

**目的**：建立專案基礎結構與開發環境

- [ ] T001 根據 plan.md 第 246-313 行建立完整的專案目錄結構（backend/ 與 frontend/）
- [ ] T002 [P] 初始化後端專案：建立 backend/package.json，安裝 Fastify v4.25+、Prisma v5.8+、TypeScript v5+、mqtt.js v5.3+、socket.io v4.6+ 等依賴項目
- [ ] T003 [P] 初始化前端專案：建立 frontend/package.json，安裝 React 18+、TypeScript 5+、Ant Design/Material-UI、Recharts/ECharts、React Router v6+、Zustand/React Query 等依賴項目
- [ ] T004 [P] 配置後端 TypeScript：建立 backend/tsconfig.json，啟用 strict mode、path aliases (@/*) 等設定
- [ ] T005 [P] 配置前端 TypeScript：建立 frontend/tsconfig.json，設定 JSX、DOM types、path aliases 等
- [ ] T006 [P] 配置 ESLint 與 Prettier：建立 backend/.eslintrc.js 與 frontend/.eslintrc.js，套用 TypeScript 規則
- [ ] T007 [P] 建立環境變數範本：建立 backend/.env.example 與 frontend/.env.example（包含資料庫、MQTT、API URL 等配置）
- [ ] T008 建立 Docker Compose 配置檔：建立 docker-compose.yml，定義 PostgreSQL、Mosquitto MQTT Broker、Redis 等服務
- [ ] T009 [P] 建立 README.md：包含專案簡介、快速啟動指令、技術堆疊說明

**檢查點**：專案結構完整，開發環境可啟動

---

## Phase 2: 基礎設施 (Foundational) 🔥 阻塞階段

**目的**：核心基礎設施，**必須**在任何使用者故事開始前完成

**⚠️ 關鍵**：在此階段完成前，所有使用者故事工作無法開始

### 資料庫與資料模型

- [ ] T010 建立 Prisma Schema：在 backend/prisma/schema.prisma 定義所有實體（User, HeatPumpDevice, Component, SafetyThreshold, Notification, TelemetryData, ControlCommand）與 11 個列舉型別，參考 data-model.md 第 1-762 行
- [ ] T011 建立初始資料庫遷移：執行 `npx prisma migrate dev --name init`，產生 backend/prisma/migrations/ 資料夾
- [ ] T012 產生 Prisma Client：執行 `npx prisma generate`，產生型別安全的資料庫查詢 API
- [ ] T013 建立資料庫種子腳本：建立 backend/prisma/seed.ts，插入預設使用者帳號（admin/admin123）、3 台測試設備、安全閾值配置
- [ ] T014 [P] 建立資料庫連線模組：建立 backend/src/database/connection.ts，封裝 Prisma Client 初始化與錯誤處理
- [ ] T015 [P] 實作資料清理排程服務：建立 backend/src/services/cleanup.ts，使用 node-cron 每日凌晨刪除超過 30 天的遙測資料與操作記錄、超過 7 天的通知

### 認證與 Session 管理

- [ ] T016 [P] 建立 User 模型層：建立 backend/src/models/user.ts，定義 User 實體介面與型別（對應 Prisma Schema）
- [ ] T017 實作密碼雜湊工具：建立 backend/src/utils/crypto.ts，使用 bcrypt v5.1+ 實作密碼雜湊與驗證函式（hashPassword, verifyPassword）
- [ ] T018 實作認證服務層：建立 backend/src/services/auth.ts，包含登入邏輯（密碼驗證、失敗計數、帳號鎖定、Session Token 生成）
- [ ] T019 建立認證中介軟體：建立 backend/src/api/middlewares/auth.ts，實作 Session Token 驗證中介軟體（從 Cookie 讀取 sessionToken，查詢資料庫驗證有效性與過期時間）
- [ ] T020 實作認證 API 路由：建立 backend/src/api/routes/auth.ts，實作 POST /api/auth/login、POST /api/auth/logout、GET /api/auth/me 端點，參考 contracts/auth-api.yaml

### MQTT 通訊基礎設施

- [ ] T021 建立 MQTT 配置模組：建立 backend/src/config/mqtt.ts，定義 Broker URL、QoS 策略、Topic 命名規範
- [ ] T022 實作 MQTT 服務層：建立 backend/src/services/mqtt.ts，封裝 mqtt.js 連線管理、訂閱/發布邏輯、自動重連機制、LWT 設定，參考 research.md 第 296-346 行
- [ ] T023 實作 MQTT 訂閱處理器：在 backend/src/services/mqtt.ts 中訂閱 `devices/+/telemetry`、`devices/+/command-ack`、`devices/+/status` Topics，接收設備資料並更新資料庫
- [ ] T024 實作遙測資料處理服務：建立 backend/src/services/telemetry.ts，處理 MQTT 接收到的遙測資料（儲存至 TelemetryData 表、更新 HeatPumpDevice 快取資料、計算 COP）

### WebSocket 即時通訊基礎設施

- [ ] T025 建立 WebSocket 伺服器：建立 backend/src/api/websocket.ts，使用 socket.io v4.6+ 建立 `/realtime` 命名空間，實作 Session Token 認證中介軟體，參考 contracts/realtime-api.md
- [ ] T026 實作 WebSocket 事件處理器：在 backend/src/api/websocket.ts 實作客戶端事件處理（subscribe:device、unsubscribe:device、subscribe:notifications）
- [ ] T027 整合 MQTT 與 WebSocket：修改 backend/src/services/mqtt.ts，當接收到新的遙測資料時，透過 socket.io 推送至訂閱該設備的所有客戶端（emit `device:telemetry:update` 事件）

### HTTP API 框架

- [ ] T028 [P] 建立 Fastify 應用主程式：建立 backend/src/main.ts，初始化 Fastify 伺服器、註冊中介軟體（CORS, Session, Logger）、設定 HTTPS（若啟用）
- [ ] T029 [P] 建立錯誤處理中介軟體：建立 backend/src/api/middlewares/error-handler.ts，統一處理未捕獲錯誤、資料庫錯誤、驗證錯誤，回傳標準化 JSON 錯誤回應
- [ ] T030 [P] 建立速率限制中介軟體：建立 backend/src/api/middlewares/rate-limiter.ts，實作控制指令速率限制邏輯（每台設備 10 秒冷卻期）
- [ ] T031 建立 API 路由主入口：建立 backend/src/api/routes/index.ts，註冊所有 API 路由（/api/auth、/api/devices、/api/notifications、/api/telemetry、/api/commands）
- [ ] T032 整合所有服務並啟動伺服器：修改 backend/src/main.ts，依序初始化資料庫連線、MQTT 服務、WebSocket 伺服器、HTTP 伺服器，監聽 PORT 3000

### 前端全域基礎設施

- [ ] T033 [P] 建立前端應用入口：建立 frontend/src/main.tsx，初始化 React 應用、掛載至 DOM、套用全域樣式
- [ ] T034 [P] 建立路由配置：建立 frontend/src/routes.tsx，使用 React Router v6+ 定義路由（/, /login, /dashboard, /devices/:id）
- [ ] T035 [P] 建立 Axios HTTP 客戶端：建立 frontend/src/services/api/client.ts，配置 baseURL、timeout、攔截器（自動附帶 Cookie、統一錯誤提示）
- [ ] T036 [P] 建立全域狀態 Store：建立 frontend/src/store/authStore.ts（使用 Zustand，管理使用者登入狀態）、frontend/src/store/uiStore.ts（管理側邊欄展開、Loading 狀態）
- [ ] T037 [P] 建立 TypeScript 型別定義：建立 frontend/src/types/models.ts、frontend/src/types/api.ts、frontend/src/types/enums.ts（與後端 API 回應格式一致）
- [ ] T038 [P] 建立全域樣式與 CSS 變數：建立 frontend/src/styles/global.css、frontend/src/styles/variables.css（定義色彩、間距、斷點）
- [ ] T039 [P] 建立通用 UI 元件：建立 frontend/src/components/atoms/Button、Input、Badge、Spinner 等基礎元件
- [ ] T040 建立 App 根元件：建立 frontend/src/App.tsx，整合路由、全域 ErrorBoundary、Zustand Provider

**檢查點**：基礎設施完整，可開始使用者故事實作

---

## Phase 3: User Story 1 - 全域儀表板一覽設備狀態 (優先級: P1) 🎯 MVP

**目標**：管理人員登入後，能在全域儀表板一眼看到所有設備的總覽資訊（在線數、耗電量、COP）、設備清單（燈號狀態）、通知中心（異常事件）

**獨立測試**：打開網頁登入後，立即看到總覽數據（在線設備數、總耗電量、總產熱量、整體COP）與左側設備清單顯示各站狀態燈號，右上角通知圖示顯示未讀數量

### 後端 API 實作（User Story 1）

- [ ] T041 [P] [US1] 建立 HeatPumpDevice 模型層：建立 backend/src/models/device.ts，定義設備實體介面與燈號顏色計算邏輯（NORMAL→綠、ABNORMAL→紅、OFFLINE→灰）
- [ ] T042 [P] [US1] 建立 Notification 模型層：建立 backend/src/models/notification.ts，定義通知實體介面
- [ ] T043 [P] [US1] 建立 SafetyThreshold 模型層：建立 backend/src/models/threshold.ts，定義閾值配置介面
- [ ] T044 [US1] 實作閾值檢測服務：建立 backend/src/services/threshold.ts，實作參數超過閾值檢測邏輯（比對 SafetyThreshold 表，判斷是否異常）
- [ ] T045 [US1] 實作通知生成服務：建立 backend/src/services/notification.ts，包含產生異常通知、設備離線通知、標記已讀等邏輯
- [ ] T046 [US1] 實作設備管理服務：建立 backend/src/services/device.ts，包含查詢所有設備、計算總覽統計資訊（在線數、總耗電、總產熱、平均COP）、設備離線偵測邏輯
- [ ] T047 [US1] 實作設備 API 路由：建立 backend/src/api/routes/devices.ts，實作 GET /api/devices（回傳設備清單與總覽資訊），參考 contracts/device-api.yaml 第 1-100 行
- [ ] T048 [US1] 實作通知 API 路由：建立 backend/src/api/routes/notifications.ts，實作 GET /api/notifications（查詢通知清單）、PATCH /api/notifications/:id/read（標記已讀）、GET /api/notifications/unread-count（未讀數量），參考 contracts/notification-api.yaml
- [ ] T049 [US1] 整合異常檢測至 MQTT 處理器：修改 backend/src/services/mqtt.ts，當接收到遙測資料時，呼叫閾值檢測服務，若異常則更新設備狀態並產生通知
- [ ] T050 [US1] 整合設備離線偵測至定時任務：修改 backend/src/services/cleanup.ts，每分鐘檢查所有設備的 lastDataReceivedAt，若超過 30 秒則標記為 OFFLINE 並產生通知

### 前端 UI 實作（User Story 1）

- [ ] T051 [P] [US1] 建立認證 API 服務：建立 frontend/src/services/api/auth.ts，實作 login()、logout()、getCurrentUser() 函式
- [ ] T052 [P] [US1] 建立設備 API 服務：建立 frontend/src/services/api/devices.ts，實作 getDevices() 函式（呼叫 GET /api/devices）
- [ ] T053 [P] [US1] 建立通知 API 服務：建立 frontend/src/services/api/notifications.ts，實作 getNotifications()、markAsRead()、getUnreadCount() 函式
- [ ] T054 [P] [US1] 建立登入頁面：建立 frontend/src/pages/LoginPage/LoginPage.tsx，包含帳號密碼輸入欄位、登入按鈕、錯誤訊息顯示（連續失敗 3 次顯示鎖定提示）
- [ ] T055 [P] [US1] 建立狀態指示器元件：建立 frontend/src/components/molecules/StatusIndicator（顯示綠/紅/灰燈號與文字說明）
- [ ] T056 [P] [US1] 建立設備卡片元件：建立 frontend/src/components/molecules/DeviceCard（展示元件，接收設備資料 props，顯示設備名稱、燈號、即時參數）
- [ ] T057 [P] [US1] 建立通知項目元件：建立 frontend/src/components/molecules/NotificationItem（顯示事件類型、時間、描述、已讀標記）
- [ ] T058 [US1] 建立設備清單元件：建立 frontend/src/components/organisms/DeviceList（有機體元件，渲染多個 DeviceCard，處理點擊導航至詳細頁面）
- [ ] T059 [US1] 建立通知中心元件：建立 frontend/src/components/organisms/NotificationCenter（下拉面板，顯示通知清單，支援標記已讀、載入更多）
- [ ] T060 [US1] 建立全域總覽統計元件：建立 frontend/src/components/organisms/GlobalSummary（顯示在線設備數、總耗電量、總產熱量、整體COP 四個數字卡片）
- [ ] T061 [US1] 建立儀表板佈局模板：建立 frontend/src/components/templates/DashboardLayout（包含頂部總覽區、左側設備清單、中央內容區、右上角通知圖示）
- [ ] T062 [US1] 建立儀表板頁面容器：建立 frontend/src/pages/DashboardPage/DashboardPage.tsx（容器元件，使用 React Query 獲取設備清單與總覽資料，整合 DashboardLayout、GlobalSummary、DeviceList、NotificationCenter）
- [ ] T063 [US1] 實作 WebSocket 即時更新：建立 frontend/src/services/websocket/client.ts，連接至 `/realtime` 命名空間，監聽 `device:telemetry:update` 事件，自動更新儀表板資料（使用 React Query 的 queryClient.invalidateQueries）
- [ ] T064 [US1] 實作受保護路由：修改 frontend/src/routes.tsx，加入認證檢查，未登入時重新導向至 /login
- [ ] T065 [US1] 實作 Loading 與錯誤狀態：在 DashboardPage 加入 Skeleton Screens（載入時）、錯誤提示（網路異常時）、Empty State（無設備時）

**檢查點**：此時 User Story 1 應完全可用且可獨立測試（登入 → 查看儀表板 → 看到設備狀態與通知）

---

## Phase 4: User Story 2 - 設備運作動態圖視覺化 (優先級: P2)

**目標**：管理人員點選某台設備後，能看到動態流程圖（視覺化壓縮機、風扇、水箱等元件）與零件狀態清單，並在設備運轉時看到動態效果

**獨立測試**：在儀表板點選某台設備，進入詳細頁面，看到動態流程圖顯示各元件圖示及其即時狀態（運轉中/停止），並看到流向動畫效果與即時溫度數值

### 後端 API 實作（User Story 2）

- [ ] T066 [P] [US2] 建立 Component 模型層：建立 backend/src/models/component.ts，定義零件實體介面（componentType、status 等）
- [ ] T067 [US2] 實作零件管理服務：建立 backend/src/services/component.ts，包含查詢設備的所有零件、更新零件狀態邏輯
- [ ] T068 [US2] 擴充設備 API 路由：修改 backend/src/api/routes/devices.ts，新增 GET /api/devices/:id（回傳單一設備詳細資訊，包含零件清單），參考 contracts/device-api.yaml
- [ ] T069 [US2] 擴充 MQTT 處理器：修改 backend/src/services/mqtt.ts，當接收到遙測資料時，同步更新零件狀態（根據 components 物件更新 Component 表）
- [ ] T070 [US2] 新增 WebSocket 設備訂閱邏輯：修改 backend/src/api/websocket.ts，處理 subscribe:device 事件，將 Socket 加入 `device:${deviceId}` 房間，推送該設備的即時更新

### 前端 UI 實作（User Story 2）

- [ ] T071 [P] [US2] 擴充設備 API 服務：修改 frontend/src/services/api/devices.ts，新增 getDeviceDetail(deviceId) 函式
- [ ] T072 [P] [US2] 建立動態流程圖元件：建立 frontend/src/components/organisms/DynamicFlowDiagram（使用 SVG 或 Canvas 繪製設備流程圖，包含壓縮機、風扇、水箱、管路圖示，根據運轉狀態顯示動畫效果）
- [ ] T073 [P] [US2] 建立零件狀態清單元件：建立 frontend/src/components/organisms/ComponentStatusList（表格或清單形式，顯示所有零件名稱與狀態）
- [ ] T074 [US2] 建立設備詳細頁面容器：建立 frontend/src/pages/DeviceDetailPage/DeviceDetailPage.tsx（容器元件，從 URL 參數獲取 deviceId，查詢設備詳細資料，整合 DynamicFlowDiagram、ComponentStatusList）
- [ ] T075 [US2] 實作設備 WebSocket 訂閱：修改 frontend/src/services/websocket/client.ts，當進入設備詳細頁面時發送 subscribe:device 事件，離開時發送 unsubscribe:device，監聽即時資料更新並刷新流程圖與零件清單
- [ ] T076 [US2] 實作動態效果：在 DynamicFlowDiagram 元件中，根據設備運轉狀態（RUNNING/STOPPED）控制 CSS 動畫（流向箭頭、旋轉效果）與顏色變化
- [ ] T077 [US2] 加入 Loading 與錯誤處理：在 DeviceDetailPage 加入 Skeleton Screens、設備離線提示、資料異常提示

**檢查點**：此時 User Stories 1 與 2 應同時可用且獨立運作（儀表板總覽 + 設備詳細頁面）

---

## Phase 5: User Story 3 - 即時趨勢圖表數據分析 (優先級: P3)

**目標**：管理人員能在設備頁面看到壓力、頻率、溫度等參數的曲線圖，觀察過去幾分鐘到幾小時的數據波動，異常區段以紅色標示

**獨立測試**：在設備詳細頁面下方，能看到溫度、壓力、頻率的即時曲線圖，可選擇時間範圍（過去10分鐘、1小時、6小時），並能清楚看到數據波動與異常標示

### 後端 API 實作（User Story 3）

- [ ] T078 [P] [US3] 建立 TelemetryData 模型層：建立 backend/src/models/telemetry.ts，定義遙測資料實體介面
- [ ] T079 [US3] 擴充遙測資料處理服務：修改 backend/src/services/telemetry.ts，新增查詢歷史趨勢資料邏輯（依 deviceId、parameter、timeRange 查詢，支援資料降採樣）
- [ ] T080 [US3] 實作遙測資料 API 路由：建立 backend/src/api/routes/telemetry.ts，實作 GET /api/telemetry/:deviceId/latest（最新資料）、GET /api/telemetry/:deviceId/trend（趨勢資料，支援 parameter、startTime、endTime 參數），參考 contracts/telemetry-api.yaml
- [ ] T081 [US3] 實作資料降採樣邏輯：在 backend/src/services/telemetry.ts 加入降採樣演算法（當查詢時間範圍過長時，自動降低資料點密度，例如 30 天查詢時每小時一筆）

### 前端 UI 實作（User Story 3）

- [ ] T082 [P] [US3] 建立遙測資料 API 服務：建立 frontend/src/services/api/telemetry.ts，實作 getLatestTelemetry(deviceId)、getTrendData(deviceId, parameter, timeRange) 函式
- [ ] T083 [P] [US3] 建立趨勢圖表元件：建立 frontend/src/components/organisms/TrendChart（使用 Recharts 或 ECharts，接收時間序列資料 props，繪製折線圖，支援多參數疊加顯示）
- [ ] T084 [US3] 實作異常區段標示：在 TrendChart 元件中，根據資料的 dataQuality 欄位或閾值比對結果，將超過閾值的區段以紅色背景或警示顏色標示
- [ ] T085 [US3] 建立時間範圍選擇器：建立 frontend/src/components/molecules/TimeRangeSelector（下拉選單或按鈕組，選項：過去10分鐘、1小時、6小時、24小時、7天、30天）
- [ ] T086 [US3] 整合趨勢圖表至設備詳細頁面：修改 frontend/src/pages/DeviceDetailPage/DeviceDetailPage.tsx，在動態流程圖下方加入 TrendChart 與 TimeRangeSelector，使用 React Query 查詢趨勢資料
- [ ] T087 [US3] 實作圖表效能優化：使用 React.memo 包裹 TrendChart，使用 useMemo 快取圖表配置物件，當資料點超過 1000 筆時自動降採樣顯示
- [ ] T088 [US3] 加入 Loading 與 Empty State：圖表載入中顯示 Skeleton，無資料時顯示「尚無歷史資料」提示

**檢查點**：此時 User Stories 1、2、3 應同時可用（儀表板 + 設備詳細 + 趨勢圖表）

---

## Phase 6: User Story 4 - 遠端遙控設備參數 (優先級: P4)

**目標**：管理人員能在設備頁面將設備切換至手動模式，並輸入目標溫度等參數，遠端控制設備運作，並查看最近 5 筆操作記錄

**獨立測試**：在設備控制區域，能看到「模式切換」按鈕與「目標參數設定」輸入欄位，點選切換模式後系統送出指令並顯示確認訊息，控制區域下方顯示最近 5 筆操作記錄

### 後端 API 實作（User Story 4）

- [ ] T089 [P] [US4] 建立 ControlCommand 模型層：建立 backend/src/models/command.ts，定義控制指令實體介面
- [ ] T090 [US4] 實作控制指令服務：建立 backend/src/services/command.ts，包含送出指令邏輯（發布至 MQTT）、速率限制檢查（檢查 lastControlledAt）、查詢操作記錄邏輯
- [ ] T091 [US4] 實作控制指令 API 路由：建立 backend/src/api/routes/commands.ts，實作 POST /api/commands（送出指令）、GET /api/commands/:id（查詢指令狀態）、GET /api/devices/:deviceId/commands/history（操作記錄），參考 contracts/control-api.yaml
- [ ] T092 [US4] 實作速率限制邏輯：修改 backend/src/api/middlewares/rate-limiter.ts，在送出指令前檢查該設備的 lastControlledAt，若在 10 秒內則拒絕並回傳剩餘秒數
- [ ] T093 [US4] 實作 MQTT 指令發布：修改 backend/src/services/command.ts，當送出控制指令時，發布至 `devices/{device_code}/commands` Topic（QoS 1），並儲存至 ControlCommand 表（狀態為 PENDING）
- [ ] T094 [US4] 實作指令確認處理：修改 backend/src/services/mqtt.ts，訂閱 `devices/+/command-ack` Topic，當接收到確認訊息時，更新 ControlCommand 表狀態為 ACKNOWLEDGED，並記錄 acknowledgedAt 時間
- [ ] T095 [US4] 實作指令超時檢測：修改 backend/src/services/cleanup.ts，每 10 秒檢查 ControlCommand 表中狀態為 PENDING 且 sentAt 超過 3 秒的指令，更新狀態為 TIMEOUT

### 前端 UI 實作（User Story 4）

- [ ] T096 [P] [US4] 建立控制指令 API 服務：建立 frontend/src/services/api/commands.ts，實作 sendCommand(deviceId, commandType, commandContent)、getCommandStatus(commandId)、getCommandHistory(deviceId) 函式
- [ ] T097 [P] [US4] 建立控制面板元件：建立 frontend/src/components/organisms/ControlPanel（包含模式切換按鈕、參數輸入欄位、套用按鈕、確認對話框）
- [ ] T098 [P] [US4] 建立操作記錄清單元件：建立 frontend/src/components/organisms/CommandHistoryList（顯示最近 5 筆操作，包含時間、操作者、操作內容）
- [ ] T099 [US4] 整合控制面板至設備詳細頁面：修改 frontend/src/pages/DeviceDetailPage/DeviceDetailPage.tsx，在趨勢圖表下方加入 ControlPanel 與 CommandHistoryList
- [ ] T100 [US4] 實作模式切換邏輯：在 ControlPanel 元件中，點選「切換至手動模式」按鈕時顯示確認對話框，確認後呼叫 sendCommand() 並顯示「指令傳送中...」載入提示
- [ ] T101 [US4] 實作參數調整邏輯：在 ControlPanel 元件中，當設備處於手動模式時啟用參數輸入欄位，輸入目標水溫後點選「套用」按鈕，送出 SET_TARGET_TEMP 指令
- [ ] T102 [US4] 實作指令狀態輪詢：送出指令後，每 1 秒輪詢 getCommandStatus() 直到狀態變為 ACKNOWLEDGED 或 TIMEOUT，更新 UI 顯示「指令已送達」或「指令逾時」
- [ ] T103 [US4] 實作速率限制提示：當收到 429 錯誤時，解析回應中的剩餘秒數，顯示「此設備剛完成操作，請等待 X 秒後再試」提示訊息
- [ ] T104 [US4] 實作設備離線保護：當設備狀態為 OFFLINE 時，停用所有控制按鈕並顯示「設備目前離線，無法執行遠端控制」提示

**檢查點**：此時 User Stories 1、2、3、4 應同時可用（儀表板 + 設備詳細 + 趨勢圖表 + 遠端控制）

---

## Phase 7: User Story 5 - 跨裝置響應式操作 (優先級: P5)

**目標**：管理人員無論使用桌機、平板或手機，介面都能自動調整版面配置，確保資訊清晰可讀且操作方便

**獨立測試**：使用不同尺寸的裝置（桌機、平板、手機）開啟網頁，驗證介面元素適當調整大小和位置，按鈕和輸入欄位易於點擊和操作

### 前端響應式設計實作（User Story 5）

- [ ] T105 [P] [US5] 定義響應式斷點：修改 frontend/src/styles/variables.css，定義斷點（mobile: ≤768px, tablet: 769px-1024px, desktop: ≥1025px）與對應的 CSS 變數
- [ ] T106 [P] [US5] 建立響應式 Grid 系統：建立 frontend/src/styles/responsive.css，定義 Flexbox/Grid 佈局工具類別
- [ ] T107 [US5] 優化儀表板佈局響應式：修改 frontend/src/components/templates/DashboardLayout，加入媒體查詢，在手機版本將設備清單改為頂部下拉選單，總覽資訊與內容區垂直堆疊
- [ ] T108 [US5] 優化設備卡片響應式：修改 frontend/src/components/molecules/DeviceCard，在手機版本減少內邊距、調整字體大小、確保卡片寬度填滿容器
- [ ] T109 [US5] 優化動態流程圖響應式：修改 frontend/src/components/organisms/DynamicFlowDiagram，使用 viewBox 屬性讓 SVG 自動縮放，在手機版本簡化顯示（隱藏次要標籤）
- [ ] T110 [US5] 優化趨勢圖表響應式：修改 frontend/src/components/organisms/TrendChart，在手機版本調整圖表高度、字體大小、legend 位置，確保圖表在小螢幕上可讀
- [ ] T111 [US5] 優化控制面板響應式：修改 frontend/src/components/organisms/ControlPanel，在手機版本將按鈕排列改為垂直堆疊，增大按鈕尺寸（至少 44x44 像素）
- [ ] T112 [US5] 優化通知中心響應式：修改 frontend/src/components/organisms/NotificationCenter，在手機版本改為全螢幕彈出面板而非下拉選單
- [ ] T113 [US5] 加入觸控回饋效果：在所有按鈕與可點擊元素加入 :active 偽類樣式（背景色變化、縮放動畫），提供明確視覺回饋
- [ ] T114 [US5] 測試響應式佈局：使用瀏覽器開發者工具裝置模擬器，測試在 iPhone SE (375px)、iPad (768px)、Desktop (1920px) 解析度下的顯示效果

**檢查點**：此時所有 User Stories 應在各種裝置上都能正常運作

---

## Phase 8: 整合測試與文件完善 (Polish & Cross-Cutting Concerns)

**目的**：跨使用者故事的改進與文件完善

- [ ] T115 [P] 建立 API 文檔：使用 Swagger/OpenAPI 自動生成後端 API 文檔，部署至 /api-docs 端點
- [ ] T116 [P] 建立前端 Storybook：設定 Storybook，為所有可重用元件建立展示頁面與使用範例
- [ ] T117 [P] 更新 README.md：補充專案簡介、架構圖、快速啟動步驟、環境變數說明、開發指令
- [ ] T118 [P] 補充 quickstart.md：驗證所有指令可正常執行，補充常見問題排除（Docker 啟動失敗、資料庫連線錯誤等）
- [ ] T119 效能優化：分析前端 bundle 大小，實作程式碼分割（Code Splitting），優化圖片載入（Lazy Loading）
- [ ] T120 安全加固：檢查所有 API 端點是否正確套用認證中介軟體，檢查輸入驗證是否完整（防止 SQL Injection、XSS）
- [ ] T121 錯誤監控整合：整合 Sentry 或類似工具，自動回報前後端未捕獲錯誤與效能問題
- [ ] T122 日誌最佳化：統一後端日誌格式（使用 pino），加入請求追蹤 ID（Correlation ID），便於除錯
- [ ] T123 資料庫效能調校：檢查所有查詢是否使用索引（執行 EXPLAIN ANALYZE），針對慢查詢加入複合索引
- [ ] T124 MQTT 連線穩定性測試：模擬 Broker 斷線、設備離線、訊息遺失等情境，驗證自動重連與錯誤恢復機制
- [ ] T125 WebSocket 連線測試：測試多客戶端同時連線、訂閱/取消訂閱、斷線重連等場景
- [ ] T126 端到端整合測試：撰寫完整的使用者旅程測試（登入 → 查看儀表板 → 點選設備 → 查看趨勢 → 遠端控制 → 登出）
- [ ] T127 壓力測試：使用 k6 或 Apache Bench 測試 API 效能，驗證是否達到 ≤500ms P95 目標，測試 50 設備與 10 並發用戶情境
- [ ] T128 執行 quickstart.md 驗證：依照 quickstart.md 步驟從頭建立開發環境，確認所有指令可正常執行

---

## 相依性與執行順序

### 階段相依性

- **Phase 1 (Setup)**：無相依性 - 可立即開始
- **Phase 2 (Foundational)**：依賴 Setup 完成 - **阻塞所有使用者故事**
- **Phase 3-7 (User Stories)**：所有使用者故事都依賴 Foundational 階段完成
  - 使用者故事完成後可並行執行（若有足夠人力）
  - 或依優先級順序執行（P1 → P2 → P3 → P4 → P5）
- **Phase 8 (Polish)**：依賴所有期望的使用者故事完成

### 使用者故事相依性

- **User Story 1 (P1)**：可在 Foundational 完成後立即開始 - 無其他故事相依性（獨立可測試）
- **User Story 2 (P2)**：可在 Foundational 完成後立即開始 - 可能與 US1 整合但應獨立可測試
- **User Story 3 (P3)**：可在 Foundational 完成後立即開始 - 可能與 US1/US2 整合但應獨立可測試
- **User Story 4 (P4)**：可在 Foundational 完成後立即開始 - 可能與 US1/US2/US3 整合但應獨立可測試
- **User Story 5 (P5)**：建議在其他 UI 故事完成後執行 - 需要優化所有現有介面

### 每個使用者故事內部

- 後端模型 → 後端服務 → 後端 API 路由
- 前端 API 服務 → 前端元件 → 前端頁面容器
- 核心功能實作 → 整合 → 錯誤處理與優化
- 故事完成後再進入下一優先級

### 平行執行機會

- 所有標記 [P] 的 Setup 任務可並行執行
- 所有標記 [P] 的 Foundational 任務可並行執行（在 Phase 2 內部）
- Foundational 階段完成後，所有使用者故事可並行開始（若團隊容量允許）
- 每個使用者故事內標記 [P] 的後端模型可並行執行
- 每個使用者故事內標記 [P] 的前端元件可並行執行
- 不同使用者故事可由不同團隊成員並行處理

---

## 平行執行範例：User Story 1

```bash
# 啟動所有 User Story 1 的後端模型（並行）：
Task: "建立 HeatPumpDevice 模型層 in backend/src/models/device.ts"
Task: "建立 Notification 模型層 in backend/src/models/notification.ts"
Task: "建立 SafetyThreshold 模型層 in backend/src/models/threshold.ts"

# 啟動所有 User Story 1 的前端 API 服務（並行）：
Task: "建立認證 API 服務 in frontend/src/services/api/auth.ts"
Task: "建立設備 API 服務 in frontend/src/services/api/devices.ts"
Task: "建立通知 API 服務 in frontend/src/services/api/notifications.ts"

# 啟動所有 User Story 1 的前端元件（並行）：
Task: "建立登入頁面 in frontend/src/pages/LoginPage/LoginPage.tsx"
Task: "建立狀態指示器元件 in frontend/src/components/molecules/StatusIndicator"
Task: "建立設備卡片元件 in frontend/src/components/molecules/DeviceCard"
Task: "建立通知項目元件 in frontend/src/components/molecules/NotificationItem"
```

---

## 實作策略

### MVP 優先（僅 User Story 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（關鍵 - 阻塞所有故事）
3. 完成 Phase 3: User Story 1
4. **停止並驗證**：獨立測試 User Story 1
5. 若準備好則部署/展示 MVP

### 漸進式交付

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示（MVP！）
3. 新增 User Story 2 → 獨立測試 → 部署/展示
4. 新增 User Story 3 → 獨立測試 → 部署/展示
5. 新增 User Story 4 → 獨立測試 → 部署/展示
6. 新增 User Story 5 → 獨立測試 → 部署/展示
7. 每個故事增加價值，不破壞前面的故事

### 平行團隊策略

若有多位開發者：

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後：
   - 開發者 A：User Story 1
   - 開發者 B：User Story 2
   - 開發者 C：User Story 3
3. 各故事獨立完成並整合

---

## 備註

- [P] 任務 = 不同檔案，無相依性，可並行執行
- [Story] 標籤將任務映射至特定使用者故事以便追蹤
- 每個使用者故事應可獨立完成與測試
- 每個任務或邏輯群組完成後提交
- 在任何檢查點停止以獨立驗證故事
- 避免：模糊任務、相同檔案衝突、破壞獨立性的跨故事相依性

---

## 任務統計摘要

- **總任務數**：128 個任務
- **Phase 1 (Setup)**：9 個任務
- **Phase 2 (Foundational)**：31 個任務（阻塞關鍵）
- **Phase 3 (User Story 1 - P1)**：25 個任務 🎯 MVP
- **Phase 4 (User Story 2 - P2)**：12 個任務
- **Phase 5 (User Story 3 - P3)**：11 個任務
- **Phase 6 (User Story 4 - P4)**：16 個任務
- **Phase 7 (User Story 5 - P5)**：10 個任務
- **Phase 8 (Polish)**：14 個任務

**建議 MVP 範疇**：Phase 1 + Phase 2 + Phase 3（僅 User Story 1）= 65 個任務

**平行執行機會**：
- Phase 1：約 6 個任務可並行（標記 [P]）
- Phase 2：約 18 個任務可並行（標記 [P]）
- Phase 3-7：各使用者故事內約 40% 任務可並行
- 若團隊有 3 位開發者，Foundational 完成後可同時進行 3 個使用者故事

**獨立測試準則**：
- **US1**：登入後看到儀表板，顯示總覽數據與設備清單燈號，通知中心可查看異常事件
- **US2**：點選設備進入詳細頁面，看到動態流程圖與零件狀態清單
- **US3**：設備詳細頁面下方顯示趨勢圖表，可選擇時間範圍並看到數據曲線
- **US4**：設備詳細頁面有控制面板，可切換模式、設定參數、查看操作記錄
- **US5**：在手機、平板、桌機上都能正常使用所有功能，介面自動調整
