# Quickstart: 熱泵遠端管理儀表板開發指南

**功能分支**: `001-heat-pump-remote-dashboard`  
**建立日期**: 2026年2月18日  
**技術棧**: Node.js + Express + Socket.io + PostgreSQL + TimescaleDB + React 18  
**目標對象**: 開發人員

## 概述

本指南提供熱泵遠端管理儀表板的開發環境設置、程式碼範例、測試指令及最佳實踐。遵循本指南可快速上手並貢獻程式碼。

**技術決策參考**: [research.md](research.md) | **資料模型**: [data-model.md](data-model.md) | **API 規格**: [contracts/](contracts/)

---

## 系統需求

| 元件 | 版本需求 |
|-----|---------|
| **OS** | macOS 12+, Ubuntu 20.04+, Windows 10+ (WSL2) |
| **Node.js** | 18 LTS (18.19.0+) |
| **PostgreSQL** | 15+ with TimescaleDB extension |
| **Redis** | 7+ (Session 儲存) |
| **Git** | 2.30+ |
| **Docker** (選用) | 20+ (容器化開發) |

---

## 快速啟動 (5 分鐘)

### 使用 Docker Compose (推薦)

```bash
# 1. Clone 專案
git clone https://github.com/your-org/Demo-v1.git
cd Demo-v1
git checkout 001-heat-pump-remote-dashboard

# 2. 啟動所有服務 (PostgreSQL + TimescaleDB + Redis + Backend + Frontend)
docker-compose up -d

# 3. 初始化資料庫
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# 4. 開啟瀏覽器
open http://localhost:3000

# 預設登入帳號: admin / Admin@123
```

**服務端口**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- WebSocket: ws://localhost:8000/socket.io
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 本地開發設置 (無 Docker)

### 1. 安裝必要工具

#### macOS (Homebrew)
```bash
brew install node@18 postgresql@15 redis
brew tap timescale/tap
brew install timescaledb

# 啟動服務
brew services start postgresql@15
brew services start redis
```

#### Ubuntu
```bash
# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15 + TimescaleDB
sudo apt install gnupg postgresql-common apt-transport-https lsb-release wget
sudo sh /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main" | sudo tee /etc/apt/sources.list.d/timescaledb.list
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update
sudo apt install postgresql-15 timescaledb-2-postgresql-15

# Redis
sudo apt install redis-server

# 啟動服務
sudo systemctl start postgresql
sudo systemctl start redis-server
```

### 2. 設定資料庫

```bash
# 連線至 PostgreSQL
psql postgres

# 建立資料庫與使用者
CREATE DATABASE heatpump_dashboard;
CREATE USER heatpump_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE heatpump_dashboard TO heatpump_admin;

# 啟用 TimescaleDB 擴展
\c heatpump_dashboard
CREATE EXTENSION IF NOT EXISTS timescaledb;
\q
```

### 3. 後端設置 (Node.js + Express)

```bash
cd backend

# 安裝相依套件
npm install

# 建立環境變數檔案
cat > .env << EOF
# Server
NODE_ENV=development
PORT=8000

# Database
DATABASE_URL=postgresql://heatpump_admin:your_secure_password@localhost:5432/heatpump_dashboard

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your_jwt_secret_key_change_in_production

# Session
SESSION_TIMEOUT_MS=1800000  # 30 minutes

# WebSocket
WEBSOCKET_HEARTBEAT_INTERVAL=15000  # 15 seconds
WEBSOCKET_TIMEOUT=30000             # 30 seconds
EOF

# 執行資料庫遷移
npm run db:migrate

# 插入種子資料 (測試帳號與裝置)
npm run db:seed

# 啟動開發伺服器
npm run dev

# 後端應在 http://localhost:8000 運行
```

**後端套件列表** (`backend/package.json`):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "pg": "^8.11.3",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "redis": "^4.6.5",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3"
  }
}
```

### 4. 前端設置 (React 18)

```bash
cd frontend

# 安裝相依套件
npm install

# 建立環境變數檔案
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
EOF

# 啟動開發伺服器
npm run dev

# 前端應在 http://localhost:3000 運行
```

**前端套件列表** (`frontend/package.json`):
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "@tanstack/react-query": "^5.17.9",
    "socket.io-client": "^4.6.1",
    "echarts": "^5.4.3",
    "echarts-for-react": "^3.0.2",
    "react-hook-form": "^7.49.2",
    "bootstrap": "^5.3.2",
    "rsuite": "^5.51.1",
    "styled-components": "^6.1.8",
    "i18next": "^23.7.11",
    "react-i18next": "^14.0.0",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10",
    "vitest": "^1.1.1",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "typescript": "^5.3.3"
  }
}
```

---

## 目錄結構

```
Demo-v1/
├── backend/                    # Node.js 後端
│   ├── src/
│   │   ├── models/             # 資料模型 (Sequelize/Prisma)
│   │   │   ├── device.js
│   │   │   ├── user.js
│   │   │   └── ...
│   │   ├── services/           # 業務邏輯層
│   │   │   ├── device-service.js
│   │   │   ├── realtime-service.js
│   │   │   ├── control-service.js
│   │   │   └── auth-service.js
│   │   ├── api/
│   │   │   ├── routes/         # API 路由
│   │   │   │   ├── device.js
│   │   │   │   ├── control.js
│   │   │   │   └── auth.js
│   │   │   ├── middleware/     # 中介軟體 (驗證、錯誤處理)
│   │   │   └── validators/     # 請求驗證 schemas
│   │   ├── websocket/          # Socket.io 事件處理
│   │   │   └── device-events.js
│   │   ├── db/
│   │   │   ├── migrations/     # 資料庫遷移腳本
│   │   │   └── seeds/          # 種子資料
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── server.js
│   │   └── server.js           # 伺服器入口
│   ├── tests/
│   │   ├── unit/               # 單元測試 (Jest)
│   │   └── integration/        # 整合測試 (Supertest)
│   └── package.json
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # 元件 (Presentational)
│   │   │   ├── dashboard/
│   │   │   ├── device/
│   │   │   ├── control/
│   │   │   └── common/
│   │   ├── pages/              # 頁面 (Container)
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── DeviceDetailPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── services/           # API 呼叫與 WebSocket
│   │   │   ├── api/
│   │   │   └── websocket/
│   │   ├── hooks/              # React Query hooks
│   │   │   ├── useDeviceData.js
│   │   │   ├── useRealtime.js
│   │   │   └── useControlCommand.js
│   │   ├── context/            # Context API (全域狀態)
│   │   │   ├── AppContext.js
│   │   │   └── AuthContext.js
│   │   ├── config/
│   │   └── App.jsx
│   ├── tests/
│   │   ├── unit/               # Vitest + React Testing Library
│   │   └── e2e/                # Playwright E2E 測試
│   └── package.json
│
├── docker-compose.yml          # Docker 編排設定
└── specs/
    └── 001-heat-pump-remote-dashboard/
        ├── spec.md
        ├── plan.md
        ├── research.md         # ← 技術決策文件
        ├── data-model.md       # ← 資料模型定義
        ├── quickstart.md       # ← 本文件
        └── contracts/          # OpenAPI 規格
            ├── device-api.yaml
            ├── control-api.yaml
            └── realtime-api.yaml
```

---

## 開發工作流程

### 1. 新增功能

```bash
# 1. 從 main 分支建立功能分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. 開發功能 (參考 API 規格與資料模型)

# 3. 撰寫測試
npm test  # 執行測試

# 4. 提交程式碼
git add .
git commit -m "feat: Add your feature description"

# 5. 推送並建立 Pull Request
git push origin feature/your-feature-name
```

### 2. 執行測試

```bash
# 後端測試 (Jest + Supertest)
cd backend
npm test                      # 執行所有測試
npm run test:watch            # Watch 模式
npm run test:coverage         # 測試覆蓋率報告

# 前端測試 (Vitest + RTL)
cd frontend
npm test                      # 執行所有測試
npm run test:ui               # Vitest UI 介面
npm run test:coverage         # 測試覆蓋率報告

# E2E 測試 (Playwright)
cd frontend
npm run test:e2e              # 執行 E2E 測試
npm run test:e2e:ui           # Playwright UI 模式
```

### 3. 程式碼品質檢查

```bash
# 後端
cd backend
npm run lint                  # ESLint 檢查
npm run lint:fix              # 自動修正
npm run format                # Prettier 格式化

# 前端
cd frontend
npm run lint
npm run lint:fix
npm run format
```

---

## 常用開發指令

### 後端 (backend/)

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 (Nodemon 自動重載) |
| `npm run build` | TypeScript 編譯 (若使用 TS) |
| `npm start` | 啟動生產伺服器 |
| `npm run db:migrate` | 執行資料庫遷移 |
| `npm run db:seed` | 插入種子資料 |
| `npm run db:reset` | 重置資料庫 (危險！) |
| `npm test` | 執行測試 |
| `npm run lint` | 程式碼檢查 |

### 前端 (frontend/)

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 (Vite HMR) |
| `npm run build` | 建置生產版本 |
| `npm run preview` | 預覽生產建置 |
| `npm test` | 執行單元測試 |
| `npm run test:e2e` | 執行 E2E 測試 |
| `npm run lint` | 程式碼檢查 |

---

## 範例程式碼

### 1. 後端 API 端點範例 (Express)

**backend/src/api/routes/device.js**:
```javascript
const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const deviceService = require('../../services/device-service');

// 取得所有裝置清單 (所有角色皆可存取)
router.get('/devices', authenticate, async (req, res, next) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    next(error);
  }
});

// 取得單一裝置詳細資料
router.get('/devices/:id', authenticate, async (req, res, next) => {
  try {
    const device = await deviceService.getDeviceById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 2. Socket.io 即時資料推送 (後端)

**backend/src/websocket/device-events.js**:
```javascript
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

function initializeWebSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Socket.io 認證中介軟體
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // 連線處理
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // 訂閱裝置即時資料
    socket.on('subscribe:device', (deviceId) => {
      socket.join(`device:${deviceId}`);
      console.log(`User ${socket.userId} subscribed to device ${deviceId}`);
    });

    // 取消訂閱
    socket.on('unsubscribe:device', (deviceId) => {
      socket.leave(`device:${deviceId}`);
    });

    // 斷線處理
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  // 廣播裝置資料更新 (由 device-service 呼叫)
  io.broadcastDeviceUpdate = (deviceId, data) => {
    io.to(`device:${deviceId}`).emit('device:update', data);
  };

  return io;
}

module.exports = initializeWebSocket;
```

### 3. React Query Hook (前端)

**frontend/src/hooks/useDeviceData.js**:
```javascript
import { useQuery } from '@tanstack/react-query';
import { deviceApi } from '../services/api/device-api';

export function useDeviceData(deviceId) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => deviceApi.getDeviceById(deviceId),
    refetchInterval: 5000, // 背景每 5 秒重新驗證
    staleTime: 2000,        // 2 秒內視為新鮮資料
    enabled: !!deviceId     // 僅在 deviceId 存在時啟用
  });
}

export function useDeviceList() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.getAllDevices(),
    refetchInterval: 10000
  });
}
```

### 4. WebSocket Hook (前端)

**frontend/src/hooks/useRealtime.js**:
```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtime(deviceId) {
  const [data, setData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!deviceId) return;

    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token }
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit('subscribe:device', deviceId);
    });

    socket.on('device:update', (newData) => {
      setData(newData);
      // 更新 React Query 快取
      queryClient.setQueryData(['device', deviceId], (oldData) => ({
        ...oldData,
        ...newData
      }));
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
    });

    return () => {
      socket.emit('unsubscribe:device', deviceId);
      socket.disconnect();
    };
  }, [deviceId, queryClient]);

  return { data, connectionStatus };
}
```

### 5. 遠端控制 Mutation Hook (前端)

**frontend/src/hooks/useControlCommand.js**:
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { controlApi } from '../services/api/control-api';
import { toast } from 'react-toastify';

export function useControlCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command) => controlApi.sendCommand(command),
    onMutate: async (command) => {
      // 樂觀更新 (Optimistic Update)
      await queryClient.cancelQueries(['device', command.deviceId]);
      const previousDevice = queryClient.getQueryData(['device', command.deviceId]);
      
      // 暫時更新裝置狀態
      queryClient.setQueryData(['device', command.deviceId], (old) => ({
        ...old,
        operation_mode: command.commandType === 'switch_mode' ? command.payload.target_mode : old.operation_mode
      }));

      return { previousDevice };
    },
    onError: (error, command, context) => {
      // 回滾至先前狀態
      queryClient.setQueryData(['device', command.deviceId], context.previousDevice);
      toast.error('控制指令失敗：' + error.message);
    },
    onSuccess: (data) => {
      toast.success('控制指令已送出，等待裝置確認');
      // 輪詢指令狀態
      pollCommandStatus(data.commandId);
    }
  });
}

async function pollCommandStatus(commandId) {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const status = await controlApi.getCommandStatus(commandId);
    if (status === 'confirmed') {
      toast.success('裝置已確認執行');
      break;
    } else if (status === 'timeout' || status === 'failed') {
      toast.error('裝置回應逾時或執行失敗');
      break;
    }
  }
}
```

---

## 資料庫操作

### 手動連線資料庫

```bash
# 連線 PostgreSQL
psql -h localhost -U heatpump_admin -d heatpump_dashboard

# 查詢裝置列表
SELECT id, device_code, name, status FROM devices;

# 查詢最近 10 筆時序資料
SELECT time, device_id, metric_name, value, unit
FROM device_metrics
ORDER BY time DESC
LIMIT 10;

# 查詢特定裝置過去 1 小時的溫度趨勢
SELECT 
  time_bucket('1 minute', time) AS bucket,
  AVG(value) AS avg_temp
FROM device_metrics
WHERE device_id = 'your-device-uuid'
  AND metric_name = 'exhaust_temp'
  AND time > NOW() - INTERVAL '1 hour'
GROUP BY bucket
ORDER BY bucket;
```

### 常用 SQL 維護指令

```sql
-- 查看 Hypertable 資訊
SELECT * FROM timescaledb_information.hypertables;

-- 查看 Chunk 分割狀況
SELECT show_chunks('device_metrics');

-- 手動壓縮特定 Chunk
SELECT compress_chunk('_timescaledb_internal._hyper_1_1_chunk');

-- 查看壓縮率
SELECT 
  pg_size_pretty(before_compression_total_bytes) AS before,
  pg_size_pretty(after_compression_total_bytes) AS after,
  ROUND(100 * (1 - after_compression_total_bytes::numeric / before_compression_total_bytes), 2) AS compression_ratio
FROM timescaledb_information.compression_settings;
```

---

## 疑難排解

### 問題 1: PostgreSQL 連線失敗

**錯誤訊息**: `ECONNREFUSED` 或 `password authentication failed`

**解決方法**:
```bash
# 1. 檢查 PostgreSQL 是否運行
sudo systemctl status postgresql  # Linux
brew services list                # macOS

# 2. 重新啟動 PostgreSQL
sudo systemctl restart postgresql  # Linux
brew services restart postgresql@15  # macOS

# 3. 檢查密碼是否正確
psql -h localhost -U heatpump_admin -d heatpump_dashboard

# 4. 檢查 pg_hba.conf 設定
# 確保允許本地連線 (trust 或 md5)
```

### 問題 2: TimescaleDB 擴展未安裝

**錯誤訊息**: `extension "timescaledb" does not exist`

**解決方法**:
```bash
# 連線資料庫
psql -U heatpump_admin -d heatpump_dashboard

# 手動建立擴展
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 問題 3: WebSocket 連線失敗

**錯誤訊息**: `WebSocket connection failed` 或 `400 Bad Request`

**解決方法**:
1. 檢查後端伺服器是否運行 (`http://localhost:8000`)
2. 檢查 CORS 設定 (後端 `backend/src/config/server.js`)
3. 檢查前端環境變數 `VITE_WS_URL`
4. 檢查瀏覽器 Console 是否有 Token 問題

### 問題 4: npm install 失敗

**錯誤訊息**: `EACCES` 或 `permission denied`

**解決方法**:
```bash
# 不要使用 sudo npm install
# 修正 npm 權限問題
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# 重新安裝
npm install
```

---

## 參考資源

### 官方文件
- **Node.js**: https://nodejs.org/docs/
- **Express.js**: https://expressjs.com/
- **Socket.io**: https://socket.io/docs/
- **React**: https://react.dev/
- **React Query**: https://tanstack.com/query/latest
- **PostgreSQL**: https://www.postgresql.org/docs/
- **TimescaleDB**: https://docs.timescale.com/

### 專案文件
- **技術決策**: [research.md](research.md)
- **資料模型**: [data-model.md](data-model.md)
- **API 規格**: [contracts/](contracts/)
- **功能規格**: [spec.md](spec.md)

### 開發工具
- **Postman Collection**: `/docs/postman/heatpump-api.json`
- **Database GUI**: DBeaver, pgAdmin, TablePlus
- **API 測試**: Postman, Insomnia, Thunder Client (VS Code)

---

## 下一步

1. 閱讀 [spec.md](spec.md) 了解完整功能需求
2. 閱讀 [data-model.md](data-model.md) 熟悉資料結構
3. 瀏覽 [contracts/](contracts/) 了解 API 介面
4. 開始開發第一個功能！

**需要協助？** 請聯繫團隊 Tech Lead 或在 Slack #heatpump-dashboard 頻道提問。
