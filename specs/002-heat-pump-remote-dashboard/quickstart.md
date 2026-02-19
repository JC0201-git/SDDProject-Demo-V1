# 快速入門指南：熱泵遠端監控儀表板

**專案**: Demo-v1  
**功能分支**: `002-heat-pump-remote-dashboard`  
**最後更新**: 2026-02-19

本指南將協助您在本地環境快速啟動專案並開始開發。

---

## 📋 目錄

1. [環境需求](#環境需求)
2. [快速啟動](#快速啟動)
3. [目錄結構](#目錄結構)
4. [開發工作流程](#開發工作流程)
5. [常見開發任務](#常見開發任務)
6. [測試指南](#測試指南)
7. [除錯與常見問題](#除錯與常見問題)
8. [實用指令快速參考](#實用指令快速參考)
9. [參考資源](#參考資源)

---

## 環境需求

### 必要軟體

| 軟體 | 版本要求 | 安裝方式 |
|------|---------|---------|
| **Node.js** | ≥ 20.x LTS | [官網下載](https://nodejs.org/) 或使用 nvm |
| **pnpm** | ≥ 8.x | `npm install -g pnpm` |
| **PostgreSQL** | ≥ 15.x | [官網下載](https://www.postgresql.org/download/) 或使用 Homebrew/Docker |
| **Mosquitto** | ≥ 2.0.x | [官網下載](https://mosquitto.org/download/) 或使用 Homebrew/Docker |

### 可選軟體

| 軟體 | 用途 | 安裝方式 |
|------|------|---------|
| **Redis** | Session 快取（若不安裝則使用記憶體儲存） | [官網下載](https://redis.io/download) 或使用 Docker |
| **Docker** | 容器化部署（開發環境可選） | [官網下載](https://www.docker.com/products/docker-desktop) |

### 作業系統支援

- ✅ macOS 12+ (推薦)
- ✅ Ubuntu 20.04+ / Debian 11+
- ✅ Windows 10+ (使用 WSL 2 推薦)

---

## 快速啟動

### 1. Clone 專案

```bash
git clone https://github.com/your-org/Demo-v1.git
cd Demo-v1
git checkout 002-heat-pump-remote-dashboard
```

### 2. 安裝依賴

```bash
# 後端依賴
cd backend
pnpm install

# 前端依賴
cd ../frontend
pnpm install
```

### 3. 啟動資料庫與 MQTT Broker

#### 選項 A：使用 Docker Compose（推薦）

```bash
# 在專案根目錄
docker-compose up -d postgres mosquitto redis
```

#### 選項 B：手動啟動

**PostgreSQL**:
```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux (systemd)
sudo systemctl start postgresql
```

**Mosquitto**:
```bash
# macOS (Homebrew)
brew services start mosquitto

# Linux (systemd)
sudo systemctl start mosquitto
```

**Redis** (可選):
```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis
```

### 4. 配置環境變數

#### 後端環境變數

建立 `backend/.env` 檔案：

```env
# 資料庫連線
DATABASE_URL="postgresql://postgres:password@localhost:5432/heat_pump_dashboard?schema=public"

# 伺服器配置
PORT=3000
NODE_ENV=development

# MQTT 配置
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_CLIENT_ID="backend-dev"

# Session 配置
SESSION_SECRET="your-secret-key-change-in-production"
SESSION_MAX_AGE=28800000  # 8 小時（毫秒）

# Redis 配置（可選）
REDIS_URL="redis://localhost:6379"

# CORS 配置
FRONTEND_URL="http://localhost:5173"
```

#### 前端環境變數

建立 `frontend/.env` 檔案：

```env
# API 端點
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=http://localhost:3000
```

### 5. 初始化資料庫

```bash
cd backend

# 執行資料庫遷移
npx prisma migrate dev --name init

# 產生 Prisma Client
npx prisma generate

# 插入種子資料（測試帳號、設備、閾值）
npx prisma db seed
```

**預設測試帳號**：
- 帳號：`admin`
- 密碼：`admin123`

### 6. 啟動開發伺服器

#### 終端機 1：後端

```bash
cd backend
pnpm dev
```

預期輸出：
```
✓ Fastify server listening on http://localhost:3000
✓ MQTT client connected to mqtt://localhost:1883
✓ WebSocket server listening on /realtime
✓ Database connected successfully
```

#### 終端機 2：前端

```bash
cd frontend
pnpm dev
```

預期輸出：
```
VITE v5.0.0  ready in 823 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 7. 驗證安裝

開啟瀏覽器訪問：

1. **前端**：http://localhost:5173
2. **後端健康檢查**：http://localhost:3000/health
3. **API 文檔**：http://localhost:3000/docs（Swagger UI）

預期回應（健康檢查）：
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T10:30:00.000Z",
  "services": {
    "database": "connected",
    "mqtt": "connected",
    "redis": "connected"
  }
}
```

---

## 目錄結構

### 專案根目錄

```
Demo-v1/
├── backend/           # 後端專案（Node.js + Fastify）
├── frontend/          # 前端專案（React + TypeScript）
├── infrastructure/    # 基礎設施配置（Docker, MQTT, PostgreSQL）
├── specs/             # 功能規格與設計文件
│   └── 002-heat-pump-remote-dashboard/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md  # 本檔案
│       └── contracts/
├── .github/           # GitHub Actions CI/CD
├── docker-compose.yml # Docker Compose 配置
└── README.md
```

### 後端目錄結構

```
backend/
├── src/
│   ├── models/              # Prisma 資料模型
│   ├── services/            # 業務邏輯服務層
│   │   ├── auth.service.ts
│   │   ├── device.service.ts
│   │   ├── mqtt.service.ts
│   │   ├── telemetry.service.ts
│   │   ├── command.service.ts
│   │   └── notification.service.ts
│   ├── api/                 # HTTP API 端點
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── devices.routes.ts
│   │   │   ├── telemetry.routes.ts
│   │   │   ├── commands.routes.ts
│   │   │   └── notifications.routes.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error-handler.middleware.ts
│   │   │   └── rate-limiter.middleware.ts
│   │   └── websocket.ts     # WebSocket 伺服器
│   ├── database/
│   │   └── connection.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── mqtt.config.ts
│   └── server.ts            # 應用入口點
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── prisma/
│   ├── schema.prisma        # Prisma Schema
│   ├── migrations/          # 資料庫遷移檔案
│   └── seed.ts              # 種子資料
├── package.json
├── tsconfig.json
└── .env
```

### 前端目錄結構

```
frontend/
├── src/
│   ├── components/          # React 元件（Atomic Design）
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── pages/               # 頁面元件
│   │   ├── LoginPage/
│   │   ├── DashboardPage/
│   │   ├── DeviceDetailPage/
│   │   └── NotFoundPage/
│   ├── services/            # API 客戶端
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── devices.ts
│   │   │   ├── telemetry.ts
│   │   │   ├── commands.ts
│   │   │   └── notifications.ts
│   │   └── websocket/
│   │       └── client.ts
│   ├── hooks/               # 自訂 React Hooks
│   │   ├── useAuth.ts
│   │   ├── useDevices.ts
│   │   ├── useTelemetry.ts
│   │   └── useWebSocket.ts
│   ├── store/               # 全域狀態管理（Zustand）
│   │   ├── authStore.ts
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript 型別定義
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── enums.ts
│   ├──utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── styles/
│   │   ├── global.css
│   │   └── variables.css
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env
```

---

## 開發工作流程

### 1. 建立功能分支

```bash
# 從最新的開發分支建立新分支
git checkout 002-heat-pump-remote-dashboard
git pull origin 002-heat-pump-remote-dashboard
git checkout -b feature/your-feature-name
```

### 2. 開發與測試

```bash
# 執行測試（監視模式）
pnpm test:watch

# 執行程式碼檢查
pnpm lint

# 自動修復程式碼格式
pnpm format
```

### 3. 提交程式碼

```bash
# 檢查變更
git status

# 加入變更
git add .

# 提交（使用語意化提交訊息）
git commit -m "feat: add device status indicator"

# 推送至遠端
git push origin feature/your-feature-name
```

**Commit 訊息規範**：
- `feat:` 新功能
- `fix:` 修復錯誤
- `docs:` 文件更新
- `style:` 程式碼格式調整
- `refactor:` 程式碼重構
- `test:` 測試相關
- `chore:` 建置或工具相關

### 4. 送出 Pull Request

1. 前往 GitHub 專案頁面
2. 點選「New Pull Request」
3. 選擇分支：`feature/your-feature-name` → `002-heat-pump-remote-dashboard`
4. 填寫 PR 描述：
   - 功能說明
   - 變更清單
   - 測試方式
   - 截圖（若有 UI 變更）
5. 指派 Reviewer
6. 等待 Code Review 與 CI 檢查通過

---

## 常見開發任務

### 新增 API 端點

#### 1. 定義路由（`backend/src/api/routes/your-feature.routes.ts`）

```typescript
import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware';
import { YourFeatureService } from '../../services/your-feature.service';

export async function yourFeatureRoutes(fastify: FastifyInstance) {
  const service = new YourFeatureService();
  
  fastify.get('/api/your-endpoint', {
    preHandler: [authMiddleware],
    schema: {
      summary: '您的端點說明',
      tags: ['YourFeature'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.getData();
    return { data };
  });
}
```

#### 2. 註冊路由（`backend/src/server.ts`）

```typescript
import { yourFeatureRoutes } from './api/routes/your-feature.routes';

// ...
await fastify.register(yourFeatureRoutes);
```

#### 3. 建立服務層（`backend/src/services/your-feature.service.ts`）

```typescript
import { prisma } from '../database/connection';

export class YourFeatureService {
  async getData() {
    return await prisma.yourModel.findMany();
  }
}
```

#### 4. 測試端點

```bash
curl http://localhost:3000/api/your-endpoint \
  -H "Cookie: session=your-session-token"
```

### 新增資料庫欄位

#### 1. 編輯 Prisma Schema（`backend/prisma/schema.prisma`）

```prisma
model YourModel {
  id        Int      @id @default(autoincrement())
  // ...existing fields
  newField  String?  // 新增欄位
  
  @@map("your_table_name")
}
```

#### 2. 建立遷移

```bash
cd backend
npx prisma migrate dev --name add_new_field_to_your_model
```

#### 3. 產生 Prisma Client

```bash
npx prisma generate
```

#### 4. 更新種子資料（若需要）

編輯 `backend/prisma/seed.ts` 並執行：

```bash
npx prisma db seed
```

### 新增前端頁面

#### 1. 建立頁面元件（`frontend/src/pages/YourPage/YourPage.tsx`）

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchYourData } from '@/services/api/your-feature';

export function YourPage() {
  const { data, isLoading, error } = useQuery(['your-data'], fetchYourData);
  
  if (isLoading) return <div>載入中...</div>;
  if (error) return <div>發生錯誤</div>;
  
  return (
    <div>
      <h1>您的頁面</h1>
      {/* Your content */}
    </div>
  );
}
```

#### 2. 新增路由（`frontend/src/routes.tsx`）

```typescript
import { YourPage } from './pages/YourPage/YourPage';

export const routes = [
  // ...existing routes
  {
    path: '/your-page',
    element: <YourPage />,
  },
];
```

#### 3. 新增 API 客戶端（`frontend/src/services/api/your-feature.ts`）

```typescript
import { apiClient } from './client';

export async function fetchYourData() {
  const response = await apiClient.get('/api/your-endpoint');
  return response.data;
}
```

### 新增前端元件

```bash
# 使用元件產生器（若有設置）
pnpm generate:component YourComponent

# 或手動建立
mkdir -p frontend/src/components/molecules/YourComponent
touch frontend/src/components/molecules/YourComponent/YourComponent.tsx
touch frontend/src/components/molecules/YourComponent/YourComponent.module.css
touch frontend/src/components/molecules/YourComponent/YourComponent.test.tsx
touch frontend/src/components/molecules/YourComponent/index.ts
```

### 除錯技巧

#### 後端除錯

```bash
# 使用 Node.js Inspector
cd backend
node --inspect node_modules/.bin/tsx src/server.ts

# 然後在 Chrome 開啟：chrome://inspect
```

#### 前端除錯

- 使用 React DevTools 瀏覽器擴充功能
- 使用 Redux DevTools（若使用 Redux）
- 在 Chrome DevTools 的 Console 中使用：

```typescript
// 查看 React Query 快取
window.queryClient.getQueryCache().getAll()

// 查看 Zustand Store
window.useAuthStore.getState()
```

---

## 測試指南

### 後端測試

#### 執行所有測試

```bash
cd backend
pnpm test
```

#### 執行特定測試檔案

```bash
pnpm test src/services/auth.service.test.ts
```

#### 執行測試並產生覆蓋率報告

```bash
pnpm test:coverage
```

預期輸出：
```
 PASS  tests/unit/services/auth.service.test.ts
 PASS  tests/integration/api/auth.routes.test.ts

Test Suites: 15 passed, 15 total
Tests:       127 passed, 127 total
Coverage:    85.4% Statements
             82.1% Branches
             88.9% Functions
             85.2% Lines
```

#### 執行監視模式

```bash
pnpm test:watch
```

### 前端測試

#### 執行所有測試

```bash
cd frontend
pnpm test
```

#### 執行特定測試檔案

```bash
pnpm test src/components/DeviceCard/DeviceCard.test.tsx
```

#### 執行 E2E 測試（Playwright）

```bash
pnpm test:e2e
```

### 程式碼覆蓋率要求

| 模組類型 | 最低覆蓋率 | 理想覆蓋率 |
|---------|-----------|-----------|
| 業務邏輯（services/） | 80% | 90%+ |
| API 路由（routes/） | 60% | 80%+ |
| 工具函式（utils/） | 90% | 95%+ |
| React 元件 | 70% | 85%+ |

---

## 除錯與常見問題

### 後端無法連接資料庫

**錯誤訊息**：
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**解決方案**：

1. 檢查 PostgreSQL 是否執行中：
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. 檢查連線字串是否正確（`backend/.env`）：
   ```env
   DATABASE_URL="postgresql://正確的帳號:正確的密碼@localhost:5432/heat_pump_dashboard"
   ```

3. 測試資料庫連線：
   ```bash
   psql -U postgres -h localhost -d heat_pump_dashboard
   ```

### MQTT Broker 連線失敗

**錯誤訊息**：
```
Error: connect ECONNREFUSED 127.0.0.1:1883
```

**解決方案**：

1. 檢查 Mosquitto 是否執行中：
   ```bash
   # macOS
   brew services list | grep mosquitto
   
   # Linux
   sudo systemctl status mosquitto
   ```

2. 測試 MQTT 連線：
   ```bash
   # 安裝 MQTT CLI 工具
   npm install -g mqtt
   
   # 測試連線
   mqtt sub -h localhost -t 'test/#'
   ```

3. 檢查 Mosquitto 配置（`/usr/local/etc/mosquitto/mosquitto.conf`）：
   ```conf
   listener 1883
   allow_anonymous true
   ```

### 前端無法連接後端 API

**錯誤訊息**：
```
AxiosError: Network Error
```

**解決方案**：

1. 檢查後端是否執行中（訪問 http://localhost:3000/health）

2. 檢查 CORS 配置（`backend/src/server.ts`）：
   ```typescript
   await fastify.register(cors, {
     origin: process.env.FRONTEND_URL || 'http://localhost:5173',
     credentials: true,
   });
   ```

3. 檢查前端環境變數（`frontend/.env`）：
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

### WebSocket 連線問題

**錯誤訊息**：
```
WebSocket connection failed: Error during WebSocket handshake
```

**解決方案**：

1. 檢查後端 WebSocket 伺服器是否啟動：
   ```bash
   # 查看後端啟動日誌
   ✓ WebSocket server listening on /realtime
   ```

2. 檢查 Socket.IO 客戶端配置（`frontend/src/services/websocket/client.ts`）：
   ```typescript
   const socket = io('http://localhost:3000/realtime', {
     auth: {
       sessionToken: getSessionToken(),
     },
   });
   ```

3. 測試 WebSocket 連線：
   ```javascript
   // 在瀏覽器 Console 執行
   const testSocket = io('http://localhost:3000/realtime');
   testSocket.on('connect', () => console.log('Connected!'));
   ```

### Prisma 遷移錯誤

**錯誤訊息**：
```
Error: Migration failed: relation "users" already exists
```

**解決方案**：

1. 重置資料庫（**警告：會刪除所有資料**）：
   ```bash
   cd backend
   npx prisma migrate reset
   ```

2. 或手動刪除遷移記錄後重新遷移：
   ```bash
   # 刪除 migrations/ 目錄
   rm -rf prisma/migrations
   
   # 重新建立遷移
   npx prisma migrate dev --name init
   ```

---

## 實用指令快速參考

### 後端指令

| 指令 | 用途 |
|------|------|
| `pnpm dev` | 啟動開發伺服器（熱重載） |
| `pnpm build` | 建置生產版本 |
| `pnpm start` | 執行生產版本 |
| `pnpm test` | 執行所有測試 |
| `pnpm test:watch` | 測試監視模式 |
| `pnpm test:coverage` | 測試覆蓋率報告 |
| `pnpm lint` | 執行 ESLint 檢查 |
| `pnpm lint:fix` | 自動修復 ESLint 錯誤 |
| `pnpm format` | 執行 Prettier 格式化 |
| `npx prisma migrate dev` | 建立資料庫遷移 |
| `npx prisma generate` | 產生 Prisma Client |
| `npx prisma studio` | 開啟 Prisma Studio（資料庫 GUI） |
| `npx prisma db seed` | 插入種子資料 |

### 前端指令

| 指令 | 用途 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 建置生產版本 |
| `pnpm preview` | 預覽生產版本 |
| `pnpm test` | 執行所有測試 |
| `pnpm test:ui` | 開啟 Vitest UI |
| `pnpm test:e2e` | 執行 E2E 測試 |
| `pnpm lint` | 執行 ESLint 檢查 |
| `pnpm lint:fix` | 自動修復 ESLint 錯誤 |
| `pnpm format` | 執行 Prettier 格式化 |
| `pnpm type-check` | 執行 TypeScript 型別檢查 |

### Docker 指令

| 指令 | 用途 |
|------|------|
| `docker-compose up -d` | 啟動所有服務（背景執行） |
| `docker-compose down` | 停止所有服務 |
| `docker-compose logs -f backend` | 查看後端日誌（即時） |
| `docker-compose ps` | 查看服務狀態 |
| `docker-compose restart backend` | 重啟後端服務 |

---

## 參考資源

### 專案文件

- [功能規格 (spec.md)](./spec.md)
- [實作計劃 (plan.md)](./plan.md)
- [技術研究 (research.md)](./research.md)
- [資料模型設計 (data-model.md)](./data-model.md)
- [API 合約 (contracts/)](./contracts/)

### 技術框架官方文件

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Fastify](https://www.fastify.io/)
- [Prisma](https://www.prisma.io/docs/)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand](https://github.com/pmndrs/zustand)
- [Socket.IO](https://socket.io/docs/v4/)
- [MQTT.js](https://github.com/mqttjs/MQTT.js)

### 學習資源

- [Prisma 入門教學](https://www.prisma.io/docs/getting-started)
- [React Query 完整指南](https://tanstack.com/query/latest/docs/react/guides/queries)
- [Socket.IO 實戰指南](https://socket.io/get-started/chat)
- [MQTT 協議介紹](https://mqtt.org/getting-started/)

### 社群資源

- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Discussions](https://github.com/your-org/Demo-v1/discussions)
- [Discord 頻道](#)（若有）

---

**需要協助？** 請在 GitHub Issues 提出問題，或聯繫專案維護者。

**Happy Coding! 🚀**
