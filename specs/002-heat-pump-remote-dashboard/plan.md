# 實作計劃：熱泵遠端監控儀表板

**分支**: `002-heat-pump-remote-dashboard` | **日期**: 2026-02-19 | **規格**: [spec.md](spec.md)
**輸入**: 功能規格檔案 `/specs/002-heat-pump-remote-dashboard/spec.md`

**註記**: 本文件由 `/speckit.plan` 命令填寫。執行工作流程請參閱 `.specify/templates/commands/plan.md`。

## 摘要

打造一個基於 Web 的熱泵遠端監控儀表板，讓管理人員透過網頁即時掌握所有熱泵設備的健康狀況與運作效率，並能遠端下達控制指令。系統採用 **React + TypeScript** 前端框架，透過 **MQTT 協議**與熱泵設備進行雙向通訊，實現 30 秒即時資料更新與 3 秒內的控制指令回應。系統設計目標為 **99% 可用性**，支援最多 50 台設備同時連線，10 位管理人員並行使用，並提供響應式介面適配桌面、平板、手機等多種裝置。

## 技術背景

**語言/版本**: 
- 前端：React 18+ + TypeScript 5+
- 後端：NEEDS CLARIFICATION（需選擇：Node.js/Express、Python/FastAPI、Go/Gin 等）

**主要依賴項目**: 
- 前端：React, TypeScript, Ant Design 或 Material-UI（UI元件庫）, Recharts 或 ECharts（圖表庫）, Axios（HTTP客戶端）, React Router v6+（路由）, Zustand 或 React Query（狀態管理）
- 後端：Fastify 4.25+（Web 框架）, mqtt.js 5.3+（MQTT Client）, Prisma 5.8+（PostgreSQL ORM）, bcrypt/Argon2（密碼雜湊）
- 基礎設施：MQTT Broker（Mosquitto 或 EMQX）, PostgreSQL 15+（資料庫）, Redis（Session 快取，可選）

**儲存**: PostgreSQL 或 MySQL（儲存使用者帳號、設備資訊、即時資料點、通知訊息、控制指令記錄）

**測試**: 
- 前端：Vitest 1.2+ + React Testing Library（單元測試、整合測試）
- 後端：Vitest 1.2+ + Supertest 6.3+（API 測試）
- E2E：Playwright（端到端測試）

**目標平台**: Web（響應式設計，支援桌面瀏覽器、平板、手機）

**專案類型**: web（frontend + backend 雙端架構）

**效能目標**: 
- 前端首次載入：≤ 5 秒
- API 回應時間：≤ 500 毫秒（P95）
- 控制指令確認：≤ 3 秒（端到端）
- 即時資料更新頻率：每 30 秒
- 趨勢圖表查詢（30天內）：≤ 2 秒

**約束條件**: 
- 系統可用性目標：99%（每月停機時間 ≤ 7.2 小時）
- 支援設備數量：最多 50 台設備同時連線
- 並發用戶數：最多 10 位管理人員同時使用
- 資料保存期限：30 天（即時資料點、操作記錄）
- 安全性：HTTPS 加密、密碼 bcrypt 雜湊、8 字元英數字密碼要求
- 控制指令速率限制：每台設備每 10 秒最多 1 次

**規模/範疇**: 
- 設備數量：支援最多 50 台熱泵設備
- 並發用戶：10 位管理人員
- 歷史資料量：30 天 × 50 設備 × 2,880 筆/天（每 30 秒一筆）≈ 430 萬筆資料點
- 使用者故事：5 個主要故事（全域儀表板、動態流程圖、趨勢圖表、遠端控制、響應式設計）
- 功能需求：49 個功能需求項目（FR-001 至 FR-049）

## 憲法檢查

*關卡：必須在 Phase 0 研究前通過。Phase 1 設計後重新檢查。*

依據 `.specify/memory/constitution.md` (Frontend Constitution v1.1.1) 檢查本專案是否符合核心原則：

### I. 資料消費 (Data Consumption) ✅

**要求**：
- 必須實作統一的 HTTP 請求攔截器
- 必須定義標準化錯誤處理機制，對 4xx/5xx 狀態碼有明確的 UI 回應協議
- 必須強制使用 API TypeScript Interfaces/Types 作為單一真實來源（SSOT）
- 禁止在沒有對應 TypeScript 介面定義的情況下進行 API 呼叫
- 必須優雅處理網路錯誤並提供使用者友善的訊息

**專案符合性**：✅ 符合
- 規格要求使用 TypeScript，將確保型別安全
- FR-020, FR-021, FR-022 明確要求網路錯誤處理與載入狀態提示
- 將在 Phase 1 設計階段定義完整的 API Interfaces

### II. 狀態管理與持久化 (State Management) ✅

**要求**：
- 必須區分三種狀態類別：Global State、Local State、Server Cache
- 必須實作單向資料流
- 禁止直接跨元件狀態變更
- 必須使用既有狀態管理方案（Redux、Zustand、Jotai）處理 Global State
- 必須使用伺服器狀態函式庫（React Query、SWR、RTK Query）處理 Server Cache

**專案符合性**：✅ 符合
- 技術背景已選擇 Zustand 或 React Query 作為狀態管理方案
- 即時設備資料屬於 Server Cache，適合使用 React Query 處理
- 使用者 Session、通知中心屬於 Global State，適合使用 Zustand 處理
- 表單輸入、UI 切換屬於 Local State，使用 React Hooks 處理

### III. 元件架構 (Component Architecture) ✅

**要求**：
- 必須遵循 Atomic Design 或 Container-Presenter 模式
- 必須定義明確元件邊界：Presentational Components（無狀態、純展示）vs Container Components（有狀態、業務邏輯）
- 禁止在單一元件中混合展示與業務邏輯
- 必須文件化元件契約（props 介面、事件、依賴項目）

**專案符合性**：✅ 符合
- 將採用 Container-Presenter 模式：
  - Presentational: DeviceCard, TrendChart, ControlPanel, NotificationBadge
  - Container: DashboardPage, DeviceDetailPage, LoginPage
- 規格中的「設備卡片」、「趨勢圖表」、「控制面板」天然適合元件化設計

### IV. 防禦性開發與 UI 韌性 (Defensive Development) ✅

**要求**：
- 必須為所有載入狀態實作 Skeleton Screens
- 必須提供統一的 Empty State 處理與可操作的使用者指引
- 必須優雅處理 API 延遲並顯示視覺載入指示器
- 必須處理 API 失敗並提供使用者友善的錯誤訊息與恢復選項
- 必須實作適當的請求超時處理

**專案符合性**：✅ 符合
- FR-020: 網路連線不穩定時顯示「讀取中...」或「載入中...」提示
- FR-021: 資料載入超過 5 秒顯示「網路連線異常，正在重試...」
- FR-022: 超過 30 秒未收到新資料顯示「資料可能已過時」警告
- 邊界情境章節詳細定義了設備離線、網路異常、資料異常等錯誤處理

### V. 文件語言標準 (Documentation Language) ✅

**要求**：
- 所有規格文件（spec.md）必須使用繁體中文（zh-TW）
- 所有實作計劃（plan.md）必須使用繁體中文（zh-TW）
- 所有使用者文件必須使用繁體中文（zh-TW）

**專案符合性**：✅ 符合
- spec.md 已使用繁體中文撰寫
- 本 plan.md 使用繁體中文撰寫
- 所有後續文件將遵循此標準

### 測試標準 (Testing Standards) ⚠️ 待實作

**要求**：
- 必須為所有工具函式和業務邏輯撰寫單元測試
- 必須為關鍵使用者旅程撰寫整合測試
- 業務邏輯模組必須達到最低 80% 程式碼覆蓋率
- 必須在測試套件中驗證 TypeScript 型別安全（生產程式碼中禁止使用 `any` 型別）

**專案狀態**：⚠️ 測試策略將在 Phase 1 設計階段明確定義
- 需在 quickstart.md 中說明測試執行方式
- 需在專案結構中規劃 tests/ 目錄

### 開發工作流程 (Development Workflow) ✅

**要求**：
- 所有程式碼必須通過 TypeScript strict mode 編譯
- 所有程式碼必須通過 ESLint 和 Prettier 檢查
- 所有 PR 必須包含新功能的測試

**專案符合性**：✅ 符合
- 技術背景已指定 TypeScript 5+
- 將在 Phase 1 設計階段建立 ESLint 和 Prettier 配置

---

**憲法檢查結果**：✅ **通過**（所有關鍵原則符合，測試標準待 Phase 1 實作）

**無需填寫複雜度追蹤表**：本專案遵循標準 Web 應用架構（frontend + backend），無違反憲法原則的情況。

## 專案結構

### 文件結構（本功能）

```text
specs/002-heat-pump-remote-dashboard/
├── spec.md              # 功能規格檔案（已完成）
├── plan.md              # 本檔案（/speckit.plan 命令輸出）
├── research.md          # Phase 0 輸出（/speckit.plan 命令）
├── data-model.md        # Phase 1 輸出（/speckit.plan 命令）
├── quickstart.md        # Phase 1 輸出（/speckit.plan 命令）
├── contracts/           # Phase 1 輸出（/speckit.plan 命令）
│   ├── device-api.yaml      # 設備資料 API 規格（OpenAPI 3.0）
│   ├── control-api.yaml     # 控制指令 API 規格（OpenAPI 3.0）
│   └── realtime-api.yaml    # 即時通訊 WebSocket 規格
└── tasks.md             # Phase 2 輸出（/speckit.tasks 命令 - 不由 /speckit.plan 建立）
```

### 原始碼結構（專案根目錄）

本專案採用 **Web 應用雙端架構（Option 2）**，包含獨立的前端與後端專案。

```text
backend/
├── src/
│   ├── models/                  # 資料模型與 ORM 實體定義
│   │   ├── user.ts/py           # 使用者模型
│   │   ├── device.ts/py         # 熱泵設備模型
│   │   ├── telemetry.ts/py      # 即時遙測資料模型
│   │   ├── notification.ts/py   # 通知訊息模型
│   │   ├── command.ts/py        # 控制指令模型
│   │   └── threshold.ts/py      # 安全閾值配置模型
│   ├── services/                # 業務邏輯服務層
│   │   ├── auth.ts/py           # 認證服務（登入、Session 管理）
│   │   ├── device.ts/py         # 設備管理服務
│   │   ├── mqtt.ts/py           # MQTT 通訊服務（訂閱/發布）
│   │   ├── telemetry.ts/py      # 遙測資料處理服務
│   │   ├── notification.ts/py   # 通知生成與管理服務
│   │   ├── command.ts/py        # 控制指令處理服務
│   │   ├── threshold.ts/py      # 閾值檢測服務
│   │   └── cleanup.ts/py        # 資料清理排程服務
│   ├── api/                     # HTTP API 端點（RESTful）
│   │   ├── routes/              # API 路由定義
│   │   │   ├── auth.ts/py       # 認證相關 API（/api/auth/*）
│   │   │   ├── devices.ts/py    # 設備相關 API（/api/devices/*）
│   │   │   ├── telemetry.ts/py  # 遙測資料 API（/api/telemetry/*）
│   │   │   ├── notifications.ts/py  # 通知相關 API（/api/notifications/*）
│   │   │   └── commands.ts/py   # 控制指令 API（/api/commands/*）
│   │   ├── middlewares/         # 中介軟體
│   │   │   ├── auth.ts/py       # 認證中介軟體（Session 驗證）
│   │   │   ├── error-handler.ts/py  # 錯誤處理中介軟體
│   │   │   └── rate-limiter.ts/py   # 速率限制中介軟體
│   │   └── websocket.ts/py      # WebSocket 伺服器（即時資料推送）
│   ├── database/                # 資料庫相關
│   │   ├── migrations/          # 資料庫遷移檔案
│   │   ├── seeds/               # 種子資料（開發用）
│   │   └── connection.ts/py     # 資料庫連線配置
│   ├── utils/                   # 工具函式
│   │   ├── crypto.ts/py         # 密碼雜湊、Token 生成
│   │   ├── validation.ts/py     # 輸入驗證工具
│   │   └── logger.ts/py         # 日誌記錄工具
│   └── config/                  # 配置檔案
│       ├── app.ts/py            # 應用配置
│       ├── database.ts/py       # 資料庫配置
│       └── mqtt.ts/py           # MQTT 配置
├── tests/
│   ├── unit/                    # 單元測試
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── integration/             # 整合測試
│   │   ├── api/
│   │   └── mqtt/
│   └── fixtures/                # 測試資料夾
└── package.json / requirements.txt  # 依賴項目清單

frontend/
├── src/
│   ├── components/              # React 元件（Atomic Design 分層）
│   │   ├── atoms/               # 原子元件（基礎 UI）
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Badge/
│   │   │   └── Spinner/
│   │   ├── molecules/           # 分子元件（組合 UI）
│   │   │   ├── StatusIndicator/ # 設備狀態燈號
│   │   │   ├── DeviceCard/      # 設備卡片
│   │   │   ├── ControlButton/   # 控制按鈕
│   │   │   └── NotificationItem/
│   │   ├── organisms/           # 有機體元件（複雜區塊）
│   │   │   ├── DeviceList/      # 設備清單
│   │   │   ├── DynamicFlowDiagram/  # 動態流程圖
│   │   │   ├── TrendChart/      # 趨勢圖表
│   │   │   ├── ControlPanel/    # 控制面板
│   │   │   └── NotificationCenter/  # 通知中心
│   │   └── templates/           # 模板（頁面佈局）
│   │       ├── DashboardLayout/
│   │       └── AuthLayout/
│   ├── pages/                   # 頁面元件（Container Components）
│   │   ├── LoginPage/           # 登入頁面
│   │   ├── DashboardPage/       # 全域儀表板
│   │   ├── DeviceDetailPage/    # 設備詳細頁面
│   │   └── NotFoundPage/        # 404 頁面
│   ├── services/                # API 客戶端服務層
│   │   ├── api/
│   │   │   ├── client.ts        # HTTP 客戶端配置（Axios）
│   │   │   ├── interceptors.ts  # 請求/回應攔截器
│   │   │   ├── auth.ts          # 認證 API 呼叫
│   │   │   ├── devices.ts       # 設備 API 呼叫
│   │   │   ├── telemetry.ts     # 遙測資料 API 呼叫
│   │   │   ├── notifications.ts # 通知 API 呼叫
│   │   │   └── commands.ts      # 控制指令 API 呼叫
│   │   └── websocket/
│   │       └── client.ts        # WebSocket 客戶端
│   ├── hooks/                   # 自訂 React Hooks
│   │   ├── useAuth.ts           # 認證狀態 Hook
│   │   ├── useDevices.ts        # 設備資料 Hook（React Query）
│   │   ├── useTelemetry.ts      # 遙測資料 Hook
│   │   ├── useNotifications.ts  # 通知管理 Hook
│   │   └── useWebSocket.ts      # WebSocket 連線 Hook
│   ├── store/                   # 全域狀態管理（Zustand）
│   │   ├── authStore.ts         # 認證狀態 Store
│   │   ├── notificationStore.ts # 通知狀態 Store
│   │   └── uiStore.ts           # UI 狀態 Store（側邊欄展開、主題等）
│   ├── types/                   # TypeScript 型別定義（SSOT）
│   │   ├── api.ts               # API 請求/回應型別
│   │   ├── models.ts            # 資料模型型別
│   │   ├── enums.ts             # 列舉型別
│   │   └── index.ts             # 型別匯出入口
│   ├── utils/                   # 工具函式
│   │   ├── format.ts            # 格式化工具（日期、數字）
│   │   ├── validation.ts        # 前端驗證工具
│   │   └── constants.ts         # 常數定義
│   ├── styles/                  # 全域樣式
│   │   ├── global.css
│   │   ├── variables.css        # CSS 變數（顏色、間距）
│   │   └── responsive.css       # 響應式斷點
│   ├── App.tsx                  # 應用根元件
│   ├── main.tsx                 # 應用入口點
│   └── routes.tsx               # 路由配置（React Router）
├── tests/
│   ├── unit/                    # 單元測試
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── integration/             # 整合測試
│   │   └── pages/
│   └── e2e/                     # 端到端測試（Playwright/Cypress）
│       └── user-journeys/
├── public/                      # 靜態資源
│   ├── favicon.ico
│   └── assets/                  # 圖片、字型等
├── package.json                 # 依賴項目清單
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 建置配置
├── .eslintrc.js                 # ESLint 配置
└── .prettierrc                  # Prettier 配置

infrastructure/                  # 基礎設施配置（可選）
├── mqtt/
│   └── mosquitto.conf           # MQTT Broker 配置
├── database/
│   └── init.sql                 # 資料庫初始化腳本
└── docker/
    ├── docker-compose.yml       # Docker Compose 配置
    ├── backend.Dockerfile
    └── frontend.Dockerfile
```

**結構決策說明**：

1. **雙端分離架構**：前端與後端完全解耦，前端透過 HTTP API 與 WebSocket 與後端通訊，便於獨立開發、測試、部署。

2. **前端採用 Atomic Design**：元件按照 atoms → molecules → organisms → templates → pages 的層級組織，提升可重用性與可維護性。

3. **前端狀態管理混合策略**：
   - Zustand 管理全域狀態（認證、通知中心、UI 設定）
   - React Query 管理伺服器快取（設備資料、遙測資料）
   - React Hooks 管理本地狀態（表單輸入、UI 切換）

4. **後端服務層分離**：Models（資料結構） → Services（業務邏輯） → API（HTTP 端點）三層架構，符合關注點分離原則。

5. **類型安全第一**：前端 `types/` 目錄集中管理所有 TypeScript 型別定義，作為 API 契約的單一真實來源（SSOT）。

6. **測試分層**：unit（單元）→ integration（整合）→ e2e（端到端）三層測試策略，確保各層級的程式碼品質。

**備註**：後端語言（Node.js/Python/Go）將在 Phase 0 研究階段根據團隊技術棧、生態系成熟度、效能需求等因素決定。目錄結構中的 `.ts/py` 表示檔案副檔名依所選語言而定。

## 複雜度追蹤

> **僅當憲法檢查有違規需要辯護時填寫**

**本專案無需填寫**：所有設計決策符合 Frontend Constitution v1.1.1 的核心原則，無違規情況。

---

## Phase 1 完成後的憲法檢查重新評估

**執行時間**: 2026-02-19  
**評估狀態**: ✅ 全部通過

### 測試標準實作狀態（原先標記為 ⚠️ 待實作）

**更新為**: ✅ **已規劃完成**

Phase 1 設計階段已完成測試策略規劃：

1. **測試框架確定**：
   - 後端：Vitest v1.2+ + Supertest v6.3+
   - 前端：Vitest v1.2+ + React Testing Library
   - E2E：Playwright

2. **測試分層明確定義**：
   - 單元測試：80%+ 覆蓋率目標（業務邏輯）
   - 整合測試：關鍵路徑覆蓋
   - E2E 測試：關鍵使用者旅程

3. **quickstart.md 包含測試執行指南**：
   - 測試執行指令（`pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`）
   - Mock 策略（資料庫、MQTT、Redis）
   - 覆蓋率要求表（依模組類型）

4. **專案結構規劃 tests/ 目錄**：
   - `backend/tests/unit/`, `backend/tests/integration/`, `backend/tests/fixtures/`
   - `frontend/tests/unit/`, `frontend/tests/integration/`, `frontend/tests/e2e/`

### 所有憲法原則符合性確認

| 憲法原則 | Phase 0 評估 | Phase 1 評估 | 變更說明 |
|---------|-------------|-------------|---------|
| I. 資料消費 | ✅ 符合 | ✅ 符合 | API 合約已完整定義（OpenAPI 3.0），型別定義在 contracts/ |
| II. 狀態管理 | ✅ 符合 | ✅ 符合 | 三層狀態分離策略已在 research.md 詳細說明 |
| III. 元件架構 | ✅ 符合 | ✅ 符合 | Container-Presenter 模式已在專案結構中體現 |
| IV. 防禦性開發 | ✅ 符合 | ✅ 符合 | Empty State、Skeleton、錯誤處理已在規格中定義 |
| V. 文件語言標準 | ✅ 符合 | ✅ 符合 | 所有文件（spec, plan, research, data-model, quickstart）均使用繁體中文 |
| 測試標準 | ⚠️ 待實作 | ✅ 已規劃 | 測試策略、框架、覆蓋率目標已完整定義 |
| 開發工作流程 | ✅ 符合 | ✅ 符合 | ESLint/Prettier 配置已在 quickstart.md 說明 |

### 設計品質驗證

**✅ 資料模型完整性**：
- 定義 7 個核心實體、11 個列舉型別
- 設計 15+ 個索引以優化查詢效能
- 考慮時間序列資料分區策略（PostgreSQL RANGE Partitioning）
- 定義 30 天資料保留策略與清理機制

**✅ API 合約完整性**：
- 產出 5 個 OpenAPI 3.0 規格檔案（auth, device, telemetry, control, notification）
- 定義統一錯誤回應格式
- Session-based Authentication 機制完整
- 涵蓋所有功能需求（FR-001 至 FR-049）

**✅ WebSocket 即時通訊規格**：
- 定義 4 種伺服器推送事件類型
- 定義房間管理策略與廣播規則
- 定義連線生命週期處理與自動重連機制
- 提供前端整合範例（React Hook 封裝）

**✅ 快速入門指南**：
- 涵蓋環境需求、安裝步驟、配置說明
- 提供目錄結構說明與開發工作流程
- 包含常見開發任務範例（新增 API、新增元件等）
- 包含除錯指南與常見問題解答

**✅ 技術研究完整性**：
- 完成後端語言選型決策（Node.js + Fastify + TypeScript）
- 完成測試策略決策（Vitest + 三層測試金字塔）
- 研究 React 狀態管理、MQTT 可靠性、PostgreSQL 優化、WebSocket 最佳實踐

---

**重新評估結論**：✅ **所有憲法原則完全符合，已達到可進入 Phase 2（任務分解）的條件。**

**下一步建議**：執行 `/speckit.tasks` 命令，進入 Phase 2 任務分解階段。

---

**規劃完成日期**: 2026-02-19  
**規劃負責人**: GitHub Copilot (Claude Sonnet 4.5)  
**規劃版本**: 1.0.0

