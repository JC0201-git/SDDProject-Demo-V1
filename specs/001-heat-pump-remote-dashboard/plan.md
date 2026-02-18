# Implementation Plan: 熱泵遠端管理儀表板（前端）

**Branch**: `001-heat-pump-remote-dashboard` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-heat-pump-remote-dashboard/spec.md`

## Summary

建置熱泵設備遠端監控前端介面，使管理人員透過網頁即時掌握設備狀態、查看運作趨勢、執行遠端控制。採用 React 16.13.1 + React-Bootstrap 2.7.0，整合 WebSocket 即時通訊、React Query 狀態管理、ECharts 圖表視覺化。支援響應式設計（桌機/平板/手機）、三級權限控制（檢視者/操作者/管理者）、及無障礙測試。

## Technical Context

**Language/Version**: JavaScript (ES2021), TypeScript 4.9+  
**Frontend Framework**: React 16.13.1 (Create React App)  
**UI Library**: React-Bootstrap 2.7.0 (Bootstrap 4.6)  
**State Management**: React Query 3.39.3 (Server Cache) + Context API (Global State)  
**Real-time Protocol**: WebSocket (HTML5 標準)  
**Charts**: ECharts 5.2.2 + echarts-for-react 3.0.2  
**i18n**: react-i18next 11.18+ (支援繁體中文等 15+ 語言)  
**Testing**: Jest 29+ (單元測試) + React Testing Library 14+ (元件測試) + Cypress 13+ (E2E 測試)  
**Target Platform**: 現代瀏覽器 (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: Web Frontend (單頁應用程式)  
**Performance Goals**: 
- 首次載入 < 3 秒
- 資料更新延遲 < 1 秒
- 圖表渲染 > 30 FPS
- 支援 100+ 設備同時監控

**Constraints**: 
- 相容 React 16（不使用 Concurrent Mode）
- 觸控按鈕 ≥ 44x44px（無障礙要求）
- 支援行動網路環境（自動重連機制）

**Scale/Scope**: 
- 10-15 個前端頁面/元件
- 3 個使用者角色
- 100+ 台設備並行監控
- 30 天歷史資料視覺化

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Passed Gates

1. **Data Consumption**: 
   - ✅ 使用 TypeScript interfaces 作為 API 型別定義 SSOT
   - ✅ 實作統一 request interceptor（HeatPumpService.ts）
   - ✅ 標準化錯誤處理機制（4xx/5xx status codes → toast notifications）

2. **State Management**: 
   - ✅ 明確三層狀態分類：
     - Server Cache: React Query（設備資料、歷史趨勢）
     - Global State: Context API（使用者 session、權限）
     - Local State: useState（UI 對話框、表單）
   - ✅ 單向資料流（unidirectional data flow）

3. **Component Architecture**: 
   - ✅ 遵循 Container-Presenter 模式
     - Pages（DeviceDashboard, DeviceDetail）→ Container
     - Components（DeviceStatusCard, TrendChart）→ Presenter
   - ✅ 元件職責單一，可重用

4. **Defensive Development**: 
   - ✅ Skeleton screens 處理 loading 狀態
   - ✅ Empty State 處理無資料情境
   - ✅ 網路錯誤提示與重試機制
   - ✅ WebSocket 斷線自動重連（exponential backoff）

5. **Documentation Language**: 
   - ✅ 所有規格文件使用繁體中文
   - ✅ 程式碼註解使用英文或繁體中文
   - ✅ API/介面名稱使用英文

## Project Structure

### Documentation (this feature)

```text
specs/001-heat-pump-remote-dashboard/
├── plan.md              # 本檔案（實作計畫）
├── spec.md              # 功能規格
├── research.md          # 技術選型研究（前端）
├── data-model.md        # 資料模型（TypeScript interfaces）
├── quickstart.md        # 開發指南
└── contracts/           # API 契約（OpenAPI）
    ├── device-api.yaml
    ├── control-api.yaml
    └── realtime-api.yaml
```

### Source Code (frontend)

```text
Demo-v1-web/
├── public/
│   ├── index.html
│   └── locales/                  # i18n 翻譯檔
│       ├── zh-TW/
│       ├── en/
│       └── zh-CN/
├── src/
│   ├── components/
│   │   └── DemoV1/
│   │       ├── common/           # 共用元件 (from Frontend-web.md)
│   │       └── HeatPump/         # NEW - 本功能元件
│   │           ├── DeviceStatusCard.js      # 設備狀態卡片
│   │           ├── DynamicFlowDiagram.js    # 動態流程圖
│   │           ├── ControlPanel.js          # 控制面板
│   │           ├── TrendChart.js            # 趨勢圖表
│   │           └── ComponentStatus.js       # 元件狀態清單
│   ├── pages/
│   │   └── DemoV1/
│   │       └── HeatPump/         # NEW - 本功能頁面
│   │           ├── Dashboard.js             # 全域儀表板
│   │           ├── DeviceDetail.js         # 設備詳細頁
│   │           └── RemoteControl.js        # 遠端控制頁
│   ├── services/
│   │   └── HeatPumpService.ts    # NEW - API client (TypeScript)
│   ├── context/
│   │   ├── UserContext.tsx       # 使用者 session (Global State)
│   │   └── PermissionContext.tsx # 權限檢查
│   ├── hooks/
│   │   ├── useDeviceRealtime.ts  # WebSocket 即時資料
│   │   ├── useDeviceControl.ts   # 控制指令
│   │   └── usePermission.ts      # 權限檢查 hook
│   ├── types/
│   │   └── heatpump.ts           # TypeScript 介面定義
│   └── App.js
├── tests/
│   ├── components/               # 元件單元測試
│   ├── integration/              # Cypress E2E 測試
│   └── hooks/                   # Custom hooks 測試
├── package.json
├── tsconfig.json
└── cypress.config.js
```

**Structure Decision**: 選用 Web Frontend 結構。專案僅實作前端介面，後端 API 假設由其他團隊提供（參考 contracts/ 定義）。元件置於 `src/components/DemoV1/HeatPump/`，遵循現有專案命名慣例（Frontend-web.md 已定義 `DemoV1/common/` 路徑）。

## Implementation Phases

### Phase 0: Research ✅ (Completed)
- ✅ 確認 React 16.13.1 + React-Bootstrap 技術棧
- ✅ 決定狀態管理策略（React Query + Context API）
- ✅ 研究 WebSocket 即時通訊實作
- ✅ 規劃測試策略（Jest + RTL + Cypress）

### Phase 1: Design ✅ (Completed)
- ✅ 定義 TypeScript 介面（data-model.md）
- ✅ 設計 API 契約（contracts/*.yaml）
- ✅ 規劃元件架構（Container-Presenter 模式）
- ✅ 產出 quickstart.md 開發指南

### Phase 2: Implementation (Next)
- 📝 實作核心元件（DeviceStatusCard, TrendChart, ControlPanel）
- 📝 實作頁面（Dashboard, DeviceDetail, RemoteControl）
- 📝 整合 WebSocket 即時資料
- 📝 實作權限控制（PermissionContext）
- 📝 撰寫單元測試（85% coverage target）
- 📝 撰寫 E2E 測試（Cypress）
- 📝 無障礙測試（axe-core）

### Phase 3: Integration & Testing
- 📝 整合後端 API（依 contracts/ 定義）
- 📝 效能測試（100+ 設備載入測試）
- 📝 跨瀏覽器測試
- 📝 響應式設計測試（桌機/平板/手機）

---

## Complexity Tracking

本專案無 Constitution 違反項目，所有設計符合前端開發準則。

---

## Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket 連線不穩定（行動網路） | 高 | 中 | 自動重連機制 + 連線狀態視覺回饋 |
| React 16 限制（無 Concurrent Mode） | 低 | 中 | 使用 React Query 優化渲染效能 |
| 100+ 設備導致頁面卡頓 | 中 | 低 | 虛擬滾動 + 分頁載入 |
| 圖表渲染效能問題 | 中 | 低 | ECharts 降採樣 + 按需載入 |

---

## Success Criteria

- ✅ 所有 P1 使用者故事通過驗收測試
- ✅ 程式碼覆蓋率 ≥ 85%
- ✅ 無障礙測試通過Lighthouse audit score ≥ 90
- ✅ 響應式設計通過不同裝置測試
- ✅ 即時資料延遲 < 1 秒
- ✅ 100 台設備同時監控無效能問題

---

## Next Steps

1. ✅ **Phase 0: Research** - Complete
2. ✅ **Phase 1: Design** - Complete  
3. 📝 **Phase 2: Implementation** - Ready to start
   - Create branch `001-heat-pump-remote-dashboard`
   - Set up development environment (ref: quickstart.md)
   - Begin component implementation
4. 📝 **Phase 3: Testing** - After implementation
5. 📝 **Phase 4: Integration** - After testing
