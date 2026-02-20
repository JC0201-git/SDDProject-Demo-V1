# 熱泵遠端監控儀表板

一個基於 Web 的熱泵設備遠端監控與控制系統，提供即時監控、數據分析與遠端操作功能。

## 📋 專案簡介

本系統允許管理人員透過網頁即時掌握所有熱泵設備的健康狀況與運作效率，並能遠端下達控制指令。系統採用現代化技術棧，提供高可用性、即時更新與響應式介面。

### 核心功能

- 🔍 **全域儀表板**：一覽所有設備狀態、在線數量、耗電量與整體效能
- 🌊 **動態流程圖**：視覺化展示設備內部運作狀態與流向動畫
- 📈 **趨勢圖表**：分析溫度、壓力、頻率等參數的歷史變化與異常標示
- 🎮 **遠端控制**：切換運作模式、調整目標參數，並追蹤操作記錄
- 📱 **響應式設計**：支援桌機、平板、手機等多種裝置
- 🔔 **即時通知**：自動偵測異常狀況並推送通知

## 🏗️ 技術架構

### 前端
- **框架**: React 18+ + TypeScript 5+
- **UI 元件庫**: Ant Design
- **圖表庫**: ECharts
- **狀態管理**: Zustand (Global State) + React Query (Server Cache)
- **路由**: React Router v6+
- **建置工具**: Vite

### 後端
- **運行時**: Node.js 18+
- **框架**: Fastify 4.25+
- **語言**: TypeScript 5+
- **ORM**: Prisma 5.8+
- **資料庫**: PostgreSQL 15+
- **訊息協議**: MQTT (mqtt.js 5.3+)
- **即時通訊**: Socket.IO 4.6+

### 基礎設施
- **MQTT Broker**: Mosquitto / EMQX
- **快取**: Redis (可選)
- **容器化**: Docker + Docker Compose

## 🚀 快速啟動

### 前置需求

- Node.js >= 18.0.0
- Docker Desktop (用於執行 PostgreSQL、MQTT、Redis)
- Git

### 安裝步驟

1. **克隆專案**
```bash
git clone <repository-url>
cd specs/002-heat-pump-remote-dashboard
```

2. **啟動基礎設施服務**
```bash
# 啟動 PostgreSQL、Mosquitto MQTT、Redis
docker-compose up -d postgres mosquitto redis

# 檢查服務狀態
docker-compose ps
```

3. **設定後端環境**
```bash
cd backend

# 安裝依賴
npm install

# 複製環境變數範本
cp .env.example .env

# 編輯 .env 設定資料庫連線等資訊
# (使用預設值即可，無需修改)

# 執行資料庫遷移
npm run prisma:migrate

# 產生 Prisma Client
npm run prisma:generate

# 執行種子資料（建立測試帳號與設備）
npm run prisma:seed

# 啟動開發伺服器
npm run dev
```

4. **設定前端環境**
```bash
cd ../frontend

# 安裝依賴
npm install

# 複製環境變數範本
cp .env.example .env

# 啟動開發伺服器
npm run dev
```

5. **開啟瀏覽器**
- 前端應用: http://localhost:5173
- 後端 API: http://localhost:3000
- API 文件: http://localhost:3000/api-docs (開發中)

### 預設測試帳號

- **帳號**: admin
- **密碼**: admin123

## 📂 專案結構

```
002-heat-pump-remote-dashboard/
├── backend/              # 後端應用
│   ├── src/
│   │   ├── models/       # 資料模型
│   │   ├── services/     # 業務邏輯服務
│   │   ├── api/          # HTTP API 端點
│   │   ├── database/     # 資料庫相關
│   │   ├── utils/        # 工具函式
│   │   └── config/       # 配置檔案
│   ├── tests/            # 測試檔案
│   ├── prisma/           # Prisma Schema 與遷移
│   └── package.json
├── frontend/             # 前端應用
│   ├── src/
│   │   ├── components/   # React 元件 (Atomic Design)
│   │   ├── pages/        # 頁面容器元件
│   │   ├── services/     # API 客戶端服務
│   │   ├── hooks/        # 自訂 Hooks
│   │   ├── store/        # 全域狀態管理
│   │   ├── types/        # TypeScript 型別定義
│   │   └── styles/       # 全域樣式
│   ├── tests/            # 測試檔案
│   └── package.json
├── infrastructure/       # 基礎設施配置
│   ├── mqtt/             # MQTT Broker 配置
│   ├── database/         # 資料庫初始化腳本
│   └── docker/           # Docker 配置
├── contracts/            # API 規格 (OpenAPI)
├── specs/                # 功能規格文件
└── docker-compose.yml    # Docker Compose 配置
```

## 🧪 執行測試

### 後端測試
```bash
cd backend

# 執行單元測試
npm run test

# 執行測試並產生覆蓋率報告
npm run test:coverage

# 監聽模式（開發時使用）
npm run test:watch
```

### 前端測試
```bash
cd frontend

# 執行單元測試
npm run test

# 執行測試並產生覆蓋率報告
npm run test:coverage

# 執行端到端測試
npm run test:e2e
```

## 📊 效能目標

- 前端首次載入: ≤ 5 秒
- API 回應時間: ≤ 500 毫秒 (P95)
- 控制指令確認: ≤ 3 秒 (端到端)
- 即時資料更新頻率: 每 30 秒
- 系統可用性: 99%
- 支援設備數量: 最多 50 台
- 並發用戶數: 最多 10 位管理人員

## 🔒 安全性

- HTTPS 加密傳輸
- 密碼 bcrypt 雜湊儲存
- Session-based 認證機制
- 8 小時 Session 過期時間
- 失敗登入次數限制（3 次）
- 控制指令速率限制（每 10 秒 1 次）
- 輸入驗證與防護（防止 SQL Injection、XSS）

## 📝 開發指令

### 後端
```bash
npm run dev          # 啟動開發伺服器（Hot Reload）
npm run build        # 建置生產版本
npm run start        # 啟動生產伺服器
npm run lint         # 執行 ESLint 檢查
npm run format       # 執行 Prettier 格式化
npm run prisma:studio  # 開啟 Prisma Studio（資料庫 GUI）
```

### 前端
```bash
npm run dev          # 啟動開發伺服器（Hot Reload）
npm run build        # 建置生產版本
npm run preview      # 預覽生產版本
npm run lint         # 執行 ESLint 檢查
npm run format       # 執行 Prettier 格式化
npm run storybook    # 啟動 Storybook 元件展示
```

## 🐛 常見問題

### Docker 服務無法啟動
```bash
# 檢查 Docker 是否正在運行
docker --version

# 清理舊的容器與卷宗（謹慎使用！會刪除資料）
docker-compose down -v

# 重新啟動服務
docker-compose up -d
```

### 資料庫連線失敗
```bash
# 確認 PostgreSQL 容器正在運行
docker-compose ps postgres

# 檢查容器日誌
docker-compose logs postgres

# 測試資料庫連線
docker exec -it heat-pump-db psql -U postgres -d heat_pump_dashboard
```

### MQTT 連線失敗
```bash
# 確認 Mosquitto 容器正在運行
docker-compose ps mosquitto

# 測試 MQTT 連線
docker exec -it heat-pump-mqtt mosquitto_sub -t 'test/#' -v
```

## 📚 文件索引

- [功能規格](./spec.md) - 詳細的功能需求與驗收標準
- [實作計劃](./plan.md) - 技術架構與實作策略
- [資料模型](./data-model.md) - 資料庫設計與實體關係
- [快速入門](./quickstart.md) - 詳細的開發指南與常見任務
- [技術研究](./research.md) - 技術選型與最佳實踐研究
- [任務清單](./tasks.md) - 實作任務分解與執行順序
- [API 規格](./contracts/) - OpenAPI 規格文件

## 👥 貢獻指南

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送至分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

請確保：
- 所有測試通過
- 程式碼通過 ESLint 檢查
- 程式碼已經過 Prettier 格式化
- 新功能包含對應的測試

## 📄 授權

MIT License

## 📞 聯絡資訊

如有問題或建議，請開啟 Issue 或聯絡專案維護人員。

---

**專案狀態**: 🚧 開發中

**版本**: 1.0.0

**最後更新**: 2024-02-20
