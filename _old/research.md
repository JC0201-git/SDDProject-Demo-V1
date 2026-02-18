# 研究文件：熱泵遠端管理儀表板技術決策

**功能分支**: `001-heat-pump-remote-dashboard`  
**建立日期**: 2026年2月18日  
**狀態**: 完成  

## 執行摘要

本研究文件針對熱泵遠端管理儀表板的技術棧選型進行評估，涵蓋後端語言選擇、即時通訊協定、資料庫方案、以及測試框架。主要決策：採用 **Node.js + Express + WebSocket** 作為後端、**PostgreSQL + TimescaleDB** 作為資料儲存、**React 18 + React Query** 作為前端、以及 **Jest/Vitest + Playwright** 作為測試框架。

## 技術決策總覽

| 類別 | 決策 | 理由 |
|------|------|------|
| 後端語言 | Node.js 18 LTS | 與前端統一技術棧，降低團隊學習成本，WebSocket 支援成熟，適合高並發 I/O |
| 後端框架 | Express.js | 生態系完整，中介軟體豐富，團隊熟悉度高 |
| 即時通訊 | WebSocket (Socket.io) | 雙向通訊支援裝置推送與遠端控制，連線狀態管理完善，自動重連機制 |
| 時序資料庫 | PostgreSQL + TimescaleDB | 成熟的關聯式資料庫，TimescaleDB 擴展提供高效時序查詢，統一儲存方案降低複雜度 |
| 元資料儲存 | PostgreSQL | 與時序資料共用資料庫，簡化交易處理與外鍵關聯 |
| Session 儲存 | Redis | 分散式 Session 共享，快速讀寫，支援 TTL 自動過期 |
| 前端版本 | React 18.2 | 並發渲染改善效能，Suspense 支援更好的載入狀態管理，生態系最新特性 |
| 狀態管理 | Context API + React Query | Context API 處理全域狀態，React Query 管理伺服器快取與即時更新，避免過度工程化 |
| 前端測試 | Vitest + React Testing Library | Vitest 比 Jest 更快且更現代，原生 ESM 支援，與 Vite 整合更佳 |
| 後端測試 | Jest + Supertest | Node.js 生態系標準測試框架，成熟穩定，豐富的 Mock 工具 |
| E2E 測試 | Playwright | 跨瀏覽器支援完整，執行速度快，自動等待機制減少 Flaky tests |

---

## 1. 後端語言與框架選擇

### 研究問題
熱泵儀表板後端需支援即時資料推送、遠端控制指令處理、歷史資料查詢、以及身份驗證。評估 **Node.js**、**Python (FastAPI)**、**Go** 三種方案的適切性。

### 決策：Node.js 18 LTS + Express.js

**選擇理由**：
1. **技術棧統一**：前端使用 React (JavaScript)，後端使用 Node.js 可統一語言，團隊可共用開發經驗，降低 Context Switch 成本
2. **非同步 I/O 優勢**：Node.js 基於事件驅動架構，適合處理大量並發連線（100+ 裝置 WebSocket），記憶體與 CPU 使用效率高
3. **WebSocket 生態成熟**：Socket.io、ws 等函式庫成熟穩定，提供自動重連、房間管理、事件廣播等高階功能
4. **快速開發**：Express.js 中介軟體生態豐富，JWT 驗證、CORS、壓縮、日誌等功能插件即用，開發效率高
5. **團隊熟悉度**：現有專案已使用 React 生態，團隊對 JavaScript/TypeScript 熟悉，學習曲線平緩

**替代方案與拒絕理由**：

| 方案 | 優勢 | 不選擇的原因 |
|------|------|-------------|
| **Python (FastAPI)** | 強大的資料處理函式庫 (Pandas, NumPy)，適合複雜運算；FastAPI 型別檢查嚴格，自動生成 OpenAPI 文件 | (1) 非同步 I/O 效能略遜於 Node.js，尤其在高並發 WebSocket 場景；(2) 團隊需學習 Python 生態，增加學習成本；(3) 本專案運算需求不高，主要是 I/O 密集 |
| **Go** | 並發效能極佳 (Goroutine)，編譯型語言執行效率高，記憶體佔用低 | (1) 強型別語言開發速度較慢，中介軟體生態不如 Node.js 豐富；(2) 團隊無 Go 經驗，學習曲線陡峭；(3) 本專案規模未達需要極致效能優化的程度 |

**效能考量**：
- Node.js 單執行緒可處理 10,000+ 並發連線（C10K 問題已解決）
- 本專案需支援 100 台裝置，每台裝置 1 個 WebSocket 連線，Node.js 綽綽有餘
- 若未來需橫向擴展，可使用 PM2 Cluster 模式或 Nginx 負載平衡

---

## 2. 即時通訊協定選擇

### 研究問題
系統需接收裝置主動推送的即時資料，並支援管理員下達遠端控制指令。評估 **WebSocket** 與 **Server-Sent Events (SSE)** 的適切性。

### 決策：WebSocket (使用 Socket.io 函式庫)

**選擇理由**：
1. **雙向通訊**：WebSocket 支援伺服器→客戶端 (裝置資料推送) 與客戶端→伺服器 (遠端控制指令) 雙向即時通訊，SSE 僅支援單向 (伺服器→客戶端)
2. **低延遲**：WebSocket 建立持久連線，無需每次請求都建立 HTTP 連線，延遲 <100ms，符合需求 (<1秒更新)
3. **Socket.io 優勢**：
   - 自動重連機制 (Exponential Backoff)
   - 房間 (Room) 管理，可將同一站點的裝置分組
   - 事件廣播，可同時推送資料給多個管理員
   - 自動降級 (WebSocket → Long Polling)，相容性佳
4. **裝置離線偵測**：WebSocket 可透過心跳 (Heartbeat) 機制偵測連線狀態，符合 FR-018 需求 (30秒未收到心跳標記離線)
5. **控制指令確認**：管理員下達控制指令後，WebSocket 可即時回應指令執行結果 (成功/失敗/逾時)，符合 FR-014 需求 (3秒內確認)

**替代方案與拒絕理由**：

| 方案 | 優勢 | 不選擇的原因 |
|------|------|-------------|
| **Server-Sent Events (SSE)** | 實作簡單，基於 HTTP，無需特殊協定；瀏覽器原生支援 EventSource API | (1) **僅支援單向通訊** (伺服器→客戶端)，遠端控制指令需另外透過 HTTP POST 送出，架構分裂；(2) 無自動重連機制，需手動實作；(3) 連線限制 (HTTP 1.1 最多 6 個並發連線)，可能影響多裝置監控 |
| **Long Polling** | 相容性最佳，所有瀏覽器都支援 | (1) 效能差，每次請求都需建立新 HTTP 連線；(2) 伺服器資源消耗高；(3) 延遲較高 (需等待請求週期)；(4) 不適合即時性要求高的場景 |
| **gRPC Streaming** | 高效能二進位協定，適合微服務架構 | (1) 瀏覽器支援不佳，需透過 gRPC-Web 層轉換；(2) 實作複雜度高；(3) 本專案規模不需微服務架構 |

**實作細節**：
- 使用 Socket.io 伺服器端連線驗證 (middleware) 檢查 JWT Token
- 設定心跳間隔為 15 秒，30 秒未收到心跳標記裝置離線
- 使用 Room 機制將同一站點的裝置與管理員分組，減少廣播範圍
- 前端使用 Socket.io 客戶端，自動處理重連邏輯

---

## 3. 資料儲存方案選擇

### 研究問題
系統需儲存裝置即時資料、30天歷史時序資料、使用者帳號資料、閥值配置等。評估最適合的資料庫方案。

### 決策：PostgreSQL 15 + TimescaleDB 擴展 + Redis

**選擇理由**：

#### 3.1 時序資料 → TimescaleDB (PostgreSQL 擴展)

1. **SQL 查詢彈性**：支援標準 SQL，可輕鬆執行複雜的聚合查詢 (GROUP BY 時間區間、JOIN 裝置元資料)
2. **自動分割 (Hypertable)**：TimescaleDB 自動將時序資料按時間分割為 Chunks，查詢效能媲美專業時序資料庫
3. **資料壓縮**：內建壓縮演算法，可將歷史資料壓縮至 10-20% 原始大小，節省儲存空間
4. **統一資料庫**：與使用者、裝置元資料共用 PostgreSQL，減少維運複雜度，避免跨資料庫查詢
5. **成熟生態**：PostgreSQL 生態完整，備份、複寫、監控工具成熟

**時序資料效能測試參考**：
- TimescaleDB 官方基準測試顯示，相較於原生 PostgreSQL，查詢效能提升 20-100 倍
- 插入效能可達 100,000+ rows/sec (取決於硬體)
- 本專案預估資料量：100 台裝置 × 10 參數 × 60 秒 (每分鐘) × 60 分 × 24 小時 × 30 天 = 2.592 億筆記錄，TimescaleDB 可輕鬆處理

#### 3.2 元資料 (使用者、裝置、閥值配置) → PostgreSQL

1. **關聯式資料**：使用者權限、裝置資訊、元件關聯等資料具備外鍵關係，關聯式資料庫最適合
2. **ACID 保證**：關鍵配置變更 (閥值修改、權限變更) 需要交易保證，確保資料一致性
3. **統一管理**：與時序資料共用資料庫，簡化 JOIN 查詢 (例如：查詢「所有 A 站的裝置過去 1 小時溫度趨勢」)

#### 3.3 Session 儲存 → Redis

1. **快速讀寫**：Redis 記憶體資料庫，讀寫延遲 <1ms，適合高頻 Session 驗證
2. **TTL 自動過期**：支援 Key 過期時間，符合 FR-026 需求 (30分鐘閒置自動登出)
3. **分散式支援**：若未來橫向擴展多台伺服器，Redis 可作為共用 Session Store

**替代方案與拒絕理由**：

| 方案 | 優勢 | 不選擇的原因 |
|------|------|-------------|
| **InfluxDB** | 專業時序資料庫，寫入效能極高，內建資料保留策略 | (1) 不支援 JOIN，需在應用層拼接裝置元資料；(2) SQL 語法不同 (InfluxQL)，學習成本高；(3) 需額外維護第二個資料庫 (使用者/裝置元資料仍需關聯式資料庫)，增加複雜度 |
| **MongoDB** | NoSQL 靈活性，nested documents 適合階層資料 | (1) 時序查詢效能不如專業時序資料庫；(2) 無外鍵約束，資料一致性需在應用層保證；(3) 團隊對 SQL 更熟悉 |
| **PostgreSQL (無 TimescaleDB)** | 無需額外擴展，維運簡單 | (1) 時序查詢效能差，30天資料量大時 (億級記錄) 查詢緩慢；(2) 無自動分割機制，需手動管理資料表分割 (Partition) |

**資料庫 Schema 設計重點**：
- TimescaleDB Hypertable: `device_metrics` (時序資料)，分割鍵為 `timestamp` + `device_id`
- PostgreSQL 表格: `devices`, `users`, `components`, `threshold_configs`, `control_commands`
- 資料保留策略: TimescaleDB Retention Policy 自動刪除 30 天前資料
- 索引策略: 在 `device_id`, `timestamp`, `parameter_name` 建立複合索引

---

## 4. 前端技術升級評估

### 研究問題
現有參考專案使用 React 16.13.1，評估是否升級至 React 18.x。

### 決策：升級至 React 18.2

**選擇理由**：
1. **並發渲染 (Concurrent Rendering)**：React 18 可中斷渲染任務，優先處理高優先順序更新 (例如使用者輸入、控制指令)，提升互動回應速度
2. **自動批次更新 (Automatic Batching)**：多次狀態更新在 React 18 中自動批次處理，減少重新渲染次數，提升效能
3. **Suspense 改善**：React 18 的 Suspense 支援資料載入，與 React Query 整合更佳，可優雅處理載入狀態
4. **useTransition / useDeferredValue**：可將低優先順序更新 (例如圖表重繪) 延遲處理，避免阻塞使用者互動
5. **生態系支援**：主流函式庫 (React Router, React Query, UI 元件庫) 皆已支援 React 18，相容性無虞
6. **長期支援**：React 16 已停止更新，升級至 React 18 確保安全性修補與社群支援

**升級風險評估**：
- **Breaking Changes 少**：React 18 向下相容性佳，主要變更在新特性 (Concurrent Rendering)，現有程式碼可漸進式採用
- **測試需求**：需重新測試所有元件，確保行為一致，預估測試工作量 +10%
- **團隊學習**：團隊需學習 Concurrent 特性與新 Hooks (useTransition, useDeferredValue)，預估學習時間 1 週

**不升級的風險**：
- 錯失效能優化機會，尤其在即時資料更新場景 (100 台裝置同時更新) 可能造成畫面卡頓
- 未來維護困難，新函式庫可能放棄 React 16 支援

**結論**：升級至 React 18.2，收益 > 成本。

---

## 5. 前端狀態管理方案

### 研究問題
參考專案使用 Context API，本專案是否需要額外的狀態管理函式庫？

### 決策：Context API (全域狀態) + React Query (伺服器快取)

**選擇理由**：
1. **職責分離**：
   - **Context API** → 管理 Global State (使用者 Session、權限、主題、語言)
   - **React Query** → 管理 Server Cache (裝置資料、歷史趨勢、控制指令)
   - **Local State** → 使用 useState/useReducer (表單輸入、UI toggle)
2. **React Query 優勢**：
   - 自動快取與背景重新驗證 (Stale-While-Revalidate 策略)
   - 自動重試 (Exponential Backoff)
   - 樂觀更新 (Optimistic Update) 支援，提升控制指令回應速度
   - 內建載入與錯誤狀態管理，符合 Defensive Development 原則
   - WebSocket 整合：可透過 `queryClient.setQueryData()` 手動更新快取，實現即時資料推送
3. **避免過度工程化**：本專案非大型 SPA，Redux 等全域狀態管理工具過於複雜，Context API 足夠應付全域設定需求

**替代方案與拒絕理由**：

| 方案 | 優勢 | 不選擇的原因 |
|------|------|-------------|
| **Redux + Redux Toolkit** | 強大的狀態管理，時光旅行除錯，Redux DevTools | (1) Boilerplate 多，開發速度慢；(2) 本專案狀態簡單，Redux 過於複雜；(3) 伺服器資料應使用快取函式庫 (React Query) 而非全域狀態 |
| **Zustand** | 輕量級全域狀態管理，API 簡潔 | (1) 仍需處理伺服器資料快取與重新驗證邏輯；(2) 不如 React Query 提供完整的伺服器狀態管理特性 |
| **Jotai / Recoil** | 原子化狀態管理，細粒度更新 | (1) 學習曲線陡峭，團隊不熟悉；(2) 本專案不需原子化狀態 |

**實作架構**：
```
Global State (Context API)
├── AuthContext → user, permissions, isLoggedIn, logout()
└── AppContext → theme, language, layout

Server Cache (React Query)
├── useDevices() → 裝置清單
├── useDeviceDetail(id) → 單一裝置詳細資料
├── useRealtimeData(id) → 即時資料 (與 WebSocket 整合)
├── useHistoricalData(id, range) → 歷史趨勢
└── useControlCommand() → 遠端控制指令 Mutation

Local State (useState)
├── Form inputs (useForm from react-hook-form)
├── UI toggles (sidebar open/close, filters)
└── Temporary selections (selected device, time range)
```

---

## 6. 測試框架選擇

### 研究問題
前後端需要完整的測試覆蓋，評估最適合的測試框架組合。

### 決策：前端 Vitest + React Testing Library，後端 Jest + Supertest，E2E Playwright

#### 6.1 前端單元測試 → Vitest + React Testing Library

**選擇理由**：
1. **Vitest 優勢**：
   - 執行速度極快 (比 Jest 快 2-10 倍)，支援 HMR (修改測試立即重跑)
   - 原生 ESM 支援，與 Vite 整合無縫
   - API 與 Jest 相容，團隊學習成本低
   - 內建 UI 介面 (vitest --ui)，視覺化測試結果
2. **React Testing Library**：
   - 遵循最佳實踐 (測試使用者行為而非實作細節)
   - 與 Vitest 整合完美
   - 社群標準，文件豐富

#### 6.2 後端測試 → Jest + Supertest

**選擇理由**：
1. **Jest**：Node.js 生態系標準測試框架，成熟穩定
2. **Supertest**：專門測試 Express.js API，可模擬 HTTP 請求

#### 6.3 E2E 測試 → Playwright

**選擇理由**：
1. **跨瀏覽器支援**：Chromium, Firefox, WebKit (Safari) 一次涵蓋
2. **自動等待機制**：智能等待元素出現，減少 Flaky tests
3. **平行執行**：測試速度快，可同時執行多個測試
4. **Trace Viewer**：失敗時可回放測試過程，除錯容易
5. **WebSocket 測試**：支援 WebSocket 協定測試，符合本專案需求

**替代方案與拒絕理由**：

| 方案 | 優勢 | 不選擇的原因 |
|------|------|-------------|
| **Cypress (E2E)** | 即時重載，開發體驗佳 | (1) 執行速度較慢；(2) 跨瀏覽器支援不如 Playwright 完整；(3) WebSocket 測試需額外外掛 |
| **Jest (前端)** | 成熟穩定，社群最大 | (1) 執行速度慢；(2) ESM 支援不佳，需額外配置；(3) Vitest 為 Jest 升級版，API 相容 |

---

## 7. 最佳實踐研究

### WebSocket 連線管理最佳實踐

**心跳機制**：
- 客戶端每 15 秒送出 ping，伺服器回應 pong
- 30 秒未收到心跳標記連線異常，符合 FR-018

**重連策略 (Exponential Backoff)**：
- 初始重試間隔 2 秒
- 每次失敗後間隔加倍 (2s → 4s → 8s → 16s → 32s)
- 最長間隔不超過 60 秒
- 最多重試 5 次

**資料同步策略**：
- 重連成功後，客戶端請求最近 5 分鐘的歷史資料補齊，避免資料遺漏

### 時序資料查詢效能優化

**TimescaleDB 最佳實踐**：
1. **Time Bucket 聚合**：查詢長時間範圍 (30天) 時，使用 `time_bucket()` 聚合為小時或天級別，減少資料點數量
2. **分割策略**：設定 Chunk 時間間隔為 1 週，平衡查詢效能與管理複雜度
3. **壓縮策略**：超過 7 天的資料自動壓縮，節省 80% 儲存空間
4. **索引優化**：在 (device_id, timestamp) 建立 BRIN 索引 (Block Range Index)，適合時序資料

### 前端效能優化

**虛擬化長列表**：
- 100 台裝置列表使用 `react-window` 或 `react-virtualized` 虛擬化渲染，避免 DOM 節點過多

**圖表效能優化**：
- ECharts 資料點數量限制 1000 點 (使用 downsampling 演算法降採樣)
- 使用 `useMemo` 快取圖表配置，避免重複計算

**Code Splitting**：
- 趨勢分析頁面使用 React.lazy 動態載入，減少首次載入時間

---

## 8. 部署與維運考量

### 容器化

**Docker 多階段建置**：
```dockerfile
# Stage 1: Build frontend
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:18 AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=backend-build /app/backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 8000
CMD ["node", "backend/src/server.js"]
```

### 反向代理 (Nginx)

```nginx
server {
  listen 80;
  
  location / {
    root /app/frontend/dist;
    try_files $uri /index.html;
  }
  
  location /api {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
  
  location /socket.io {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 監控與日誌

- **應用監控**: PM2 + PM2 Plus (Node.js 進程管理)
- **資料庫監控**: pgAdmin + TimescaleDB Toolkit
- **日誌管理**: Winston (結構化日誌) + Docker logs
- **錯誤追蹤**: Sentry (前後端錯誤自動回報)

---

## 9. 風險評估與緩解策略

| 風險 | 影響 | 機率 | 緩解策略 |
|------|------|------|----------|
| **WebSocket 連線不穩定** | 資料遺漏，控制指令遺失 | 中 | (1) 實作自動重連與心跳機制；(2) 重連後補齊歷史資料；(3) 控制指令使用持久化 Queue (可選) |
| **時序資料庫效能瓶頸** | 查詢緩慢，使用者體驗差 | 低 | (1) TimescaleDB 分割與壓縮；(2) 前端圖表資料點降採樣；(3) 使用快取 (Redis) 儲存熱門查詢結果 |
| **前端效能問題 (100 台裝置同時更新)** | 畫面卡頓，互動延遲 | 中 | (1) React 18 並發渲染；(2) 虛擬化長列表；(3) 使用 `useMemo` / `useCallback` 避免不必要的重新渲染 |
| **TypeScript 型別定義維護成本高** | API 變更時前後端型別不一致 | 中 | (1) 使用 OpenAPI 自動生成 TypeScript 型別；(2) 使用 Zod 或 Yup 在執行期驗證資料結構 |
| **測試覆蓋率不足** | 功能迴歸，上線後故障 | 中 | (1) 在 CI/CD 設定最低覆蓋率門檻 (80%)；(2) 關鍵流程 (登入、控制指令) 必須有 E2E 測試 |

---

## 10. 技術債務與未來優化方向

**Phase 1 (MVP) 不實作，但未來可考慮**：
- **GraphQL**：若前端需求變化頻繁，可考慮從 REST 遷移至 GraphQL，減少 over-fetching
- **微服務架構**：若裝置數量超過 1000 台，可拆分為 Auth Service, Device Service, History Service
- **時序資料降採樣**：超過 7 天的資料可降採樣為小時級別，節省儲存空間與查詢時間
- **離線支援 (Progressive Web App)**：使用 Service Worker 快取介面與最近資料，離線時仍可查看
- **AI 異常偵測**：引入機器學習模型，預測裝置故障 (目前僅基於閥值警示)

---

## 結論

本研究文件針對熱泵遠端管理儀表板的技術棧進行全面評估，最終決策為：

**核心技術棧**：
- 後端: Node.js 18 + Express + Socket.io + PostgreSQL + TimescaleDB + Redis
- 前端: React 18 + React Query + Context API + ECharts + Vitest
- 部署: Docker + Nginx + PM2

**決策原則**：
1. **務實主義**：選擇成熟穩定的技術，避免過度工程化
2. **團隊考量**：統一前後端技術棧 (JavaScript/TypeScript)，降低學習成本
3. **效能保證**：確保滿足即時性需求 (<1秒資料更新，<3秒控制回應)
4. **未來擴展**：架構設計考慮橫向擴展可能性 (100→1000 台裝置)

所有 **NEEDS CLARIFICATION** 項目已全數解決，可進入 Phase 1 設計階段。
