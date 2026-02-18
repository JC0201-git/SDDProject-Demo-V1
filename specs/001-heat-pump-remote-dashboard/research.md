# Research: 熱泵遠端管理儀表板前端技術選型

**Date**: 2026-02-17  
**Phase**: 0 - Technical Research  
**Input**: Technical Context unknowns from plan.md

## Executive Summary

本文檔記錄熱泵遠端管理儀表板的前端技術選型研究，解決 Technical Context 中標記為 NEEDS CLARIFICATION 的項目。基於現有 Frontend-web.md 技術規格（React 16.13.1 前端已確立），本研究聚焦於即時通訊機制、前端狀態管理、測試策略及最佳實踐。

## Research Tasks

### 1. Real-time Communication Protocol

**Context**: 設備主動推送資料（spec FR-001），儀表板需 <1s 更新（FR-002），需確定前後端即時通訊機制。

**Options Evaluated**:

| Protocol | Pros | Cons | Verdict |
|----------|------|------|---------|
| **WebSocket** | • 雙向全雙工通訊<br>• 低延遲（<50ms）<br>• 瀏覽器原生支援<br>• 可推送任意資料結構 | • 需維護長連線<br>• 防火牆可能阻擋 | ✅ **推薦** |
| **Server-Sent Events (SSE)** | • HTTP 協定，防火牆友善<br>• 自動重連機制<br>• 單向推送簡單場景適用 | • 僅單向（server → client）<br>• 瀏覽器連線數限制（6 個/domain） | ⚠️ 備選 |
| **Polling** | • 實作簡單<br>• 無連線狀態管理 | • 高延遲<br>• 浪費頻寬<br>• 無法達成 <1s 更新目標 | ❌ 不適用 |

**Decision**: **WebSocket (標準 HTML5 WebSocket API + FastAPI WebSocket)**

**Rationale**:
1. **延遲要求**: Spec 要求 <1s 更新（FR-002），WebSocket 延遲通常 <50ms，遠優於 SSE 或 Polling
2. **雙向需求**: 未來可能需要前端主動訂閱特定設備（優化頻寬），WebSocket 支援 client → server 訊息
3. **瀏覽器支援**: 所有現代瀏覽器（Chrome 90+, Firefox 88+, Safari 14+）原生支援
4. **FastAPI 整合**: FastAPI 內建 WebSocket 端點，無需安裝額外套件

**Implementation Details**:
```javascript
// Frontend: React Hook for WebSocket
function useDeviceRealtime(deviceId) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/devices/${deviceId}`);
    ws.onmessage = (event) => setData(JSON.parse(event.data));
    ws.onerror = () => toast.error("連線中斷，請檢查網路");
    return () => ws.close();
  }, [deviceId]);
  
  return data;
}
```

**Alternatives Considered**:
- **為何不選 SSE**: 雖防火牆友善，但單向限制及瀏覽器連線數限制（100 台設備可能需訂閱多個 stream）使其不適合規模化。未來若需穿透嚴格防火牆可降級至 SSE
- **為何不選 Polling**: 完全無法滿足 <1s 更新及效能要求，且浪費伺服器資源

---

### 2. Frontend State Management

**Context**: 需選擇狀態管理方案以處理設備資料（Server Cache）、使用者 session（Global State）、及 UI 狀態（Local State），遵循 Constitution 原則。

**Options Evaluated**:

| Solution | Type | Pros | Cons | Verdict |
|----------|------|------|------|---------|
| **React Query** | Server Cache | • 自動快取、重新驗證<br>• 內建 loading/error 狀態<br>• WebSocket 整合良好<br>• 減少 boilerplate | • 不適合複雜同步 state | ✅ **推薦**（Server Cache） |
| **Context API** | Global State | • React 內建，無需額外套件<br>• 簡單場景足夠 | • 大量訂閱時效能問題 | ✅ **推薦**（User Session） |
| **Redux** | Global State | • 成熟生態<br>• 強大 DevTools<br>• 可預測狀態流 | • Boilerplate 多<br>• 學習曲線陡峭 | ⚠️ 備選 |
| **useState** | Local State | • React 內建<br>• 最簡單直觀 | • 無跨元件共享 | ✅ **推薦**（UI State） |

**Decision**: **React Query + Context API + useState**

**Rationale**:
1. **Server Cache (React Query)**: 設備資料來自 API/WebSocket，使用 React Query 自動處理快取、重新驗證、loading 狀態，減少手動管理
2. **Global State (Context API)**: 使用者 session（登入狀態、權限）使用 Context，避免 Redux 的複雜性
3. **Local State (useState)**: UI 臨時狀態（表單輸入、對話框）使用 useState，保持簡單

**Implementation Strategy**:
```typescript
// Server Cache: React Query for device data
const { data: devices, isLoading, error } = useQuery('devices', fetchDevices);

// Global State: Context for user session
const UserContext = createContext<UserSession | null>(null);

// Local State: useState for UI
const [showModal, setShowModal] = useState(false);
```

---

### 3. Frontend Testing Strategy

### 3. Frontend Testing Strategy

**Context**: Constitution 要求 80% 程式碼覆蓋率、單元測試、整合測試、無障礙測試。需確定前端測試框架及工具。

**Testing Stack**:

| Tool | Purpose | Verdict |
|------|---------|---------|
| **Jest** | 測試執行器（Test Runner） | ✅ CRA 內建 |
| **React Testing Library** | React 元件測試 | ✅ **推薦** |
| **Cypress** | E2E 整合測試 | ✅ **推薦** |
| **axe-core** | 無障礙測試 | ✅ **推薦** |

**Decision**: **Jest + React Testing Library + Cypress + axe-core**

**Rationale**:
1. **Jest + RTL**: Create React App 內建 Jest，React Testing Library 是 React 官方推薦的測試工具，強調測試使用者行為而非實作細節
2. **Cypress**: 用於 E2E 測試關鍵使用者流程（spec 驗收情境：登入 → 監控 → 遠端控制），提供 Time Travel Debugging
3. **axe-core**: 自動化無障礙檢測，確保行動裝置觸控按鈕 ≥44x44px（spec FR-021）

**Frontend Test Coverage Goals**:
- **Unit Tests (Jest + RTL)**: 
  - 所有 presentational components（DeviceStatusCard, ControlPanel, etc.）
  - 所有 custom hooks（useDeviceRealtime, useDeviceControl）
  - API service functions（HeatPumpService.js）
  - Target: 85% coverage
- **Integration Tests (Cypress)**:
  - 登入 → 儀表板載入 → 設備狀態更新（FR-002）
  - 遠端控制指令 → 確認對話框 → 送出 → 回應（FR-014）
  - 網路中斷 → 錯誤訊息顯示（FR-017）
  - Target: 所有 P1/P2 使用者故事

**Example Test Structure**:
```javascript
// tests/components/ControlPanel.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ControlPanel from './ControlPanel';
import HeatPumpService from '../services/HeatPumpService';

jest.mock('../services/HeatPumpService');

describe('ControlPanel', () => {
  test('renders mode switch buttons', () => {
    render(<ControlPanel deviceId="test-device-1" currentMode="auto" />);
    expect(screen.getByText('切換至手動模式')).toBeInTheDocument();
  });

  test('shows confirmation dialog before mode switch', async () => {
    render(<ControlPanel deviceId="test-device-1" currentMode="auto" />);
    fireEvent.click(screen.getByText('切換至手動模式'));
    expect(screen.getByText('確定要切換至手動模式嗎？')).toBeInTheDocument();
  });
});
```

---

### 4. Best Practices Research

**Challenge**: 保持 100+ 設備的 WebSocket 連線穩定，處理斷線重連。

**Best Practices**:
1. **心跳機制（Heartbeat）**: 每 30 秒送 ping/pong，偵測死連線（spec FR-018 要求 5 秒偵測，WebSocket 原生 ping 更快）
2. **自動重連**: 前端 WebSocket 斷線時自動重連，指數退避（1s, 2s, 4s, 8s, ...最多 60s）
3. **連線池（Backend）**: FastAPI 使用 asyncio.Queue 管理設備訊息佇列，避免記憶體洩漏

**Reference Implementation**:
```javascript
// Frontend: Auto-reconnect WebSocket
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectInterval = 1000;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 60000);
    };
    this.ws.onopen = () => { this.reconnectInterval = 1000; };
  }
}
```

#### 4.2 Permission-Based UI Rendering

**Challenge**: 根據使用者角色（viewer/operator/admin）動態顯示/隱藏功能（spec FR-025）。

**Best Practices**:
1. **Context + HOC**: 建立 PermissionContext 提供 `hasPermission(action)` 函式
2. **宣告式權限元件**: `<RequirePermission action="control:device">...</RequirePermission>`
3. **後端驗證**: 前端隱藏僅為 UX，後端 API 必須再次驗證權限（雙重保障）

**Reference Implementation**:
```javascript
// Frontend: Permission Context
const PermissionContext = createContext();

function RequirePermission({ action, children }) {
  const { hasPermission } = useContext(PermissionContext);
  return hasPermission(action) ? children : null;
}

// Usage in component
<RequirePermission action="control:device">
  <ControlPanel deviceId={deviceId} />
</RequirePermission>
```

#### 4.3 Responsive Design Best Practices

**Challenge**: 確保儀表板在不同裝置（桌機、平板、手機）上都有良好體驗（spec FR-020）。

**Best Practices**:
1. **Mobile-First CSS**: 使用 React-Bootstrap 的 Grid 系統實作響應式版面
2. **條件渲染**: 根據螢幕寬度載入不同元件（例如：手機顯示簡化版圖表）
3. **觸控優化**: 確保互動元素至少 44x44px（spec FR-021）

**Reference Implementation**:
```javascript
// Responsive layout with React-Bootstrap
import { Container, Row, Col } from 'react-bootstrap';

function Dashboard() {
  return (
    <Container fluid>
      <Row>
        <Col xs={12} md={4}>
          <DeviceList />
        </Col>
        <Col xs={12} md={8}>
          <DeviceDetail />
        </Col>
      </Row>
    </Container>
  );
}
```

---

## Technology Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Frontend Framework** | React | 16.13.1 | 已確立（Frontend-web.md） |
| **UI Library** | React-Bootstrap | 2.7.0 | 已確立（Frontend-web.md） |
| **State Management** | React Query + Context | 3.39.3 | Server Cache + Global State 分離 |
| **Real-time Protocol** | WebSocket | HTML5 標準 | 低延遲，雙向通訊 |
| **Charts** | ECharts | 5.2.2 | 豐富圖表類型，效能佳 |
| **Testing Framework** | Jest + RTL | 29+ / 14+ | CRA 內建，React 官方推薦 |
| **E2E Testing** | Cypress | 13+ | Time Travel Debugging，視覺回饋 |
| **TypeScript** | TypeScript | 4.9+ | 型別安全，API 介面定義 |
| **i18n** | react-i18next | 11.18+ | 多語系支援 |

---

## Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket 連線不穩定（行動網路） | 高 - 無法即時監控 | 中 | 自動重連機制 + 連線狀態視覺回饋 |
| React 16 限制（無 Concurrent Mode） | 低 - 開發體驗受限 | 中 | 先以 16.13.1 開發，Phase 2 評估升級至 18 |
| 瀏覽器相容性問題 | 中 - 部分使用者無法使用 | 低 | Polyfills + 提示升級瀏覽器 |
| 大量設備導致效能問題 | 中 - 頁面卡頓 | 低 | 虛擬滾動 + 分頁載入 |

---

## Next Steps (Phase 1)

1. ✅ Technical decisions finalized
2. 📝 **Phase 1 Task 1**: Generate `data-model.md` - 定義前端 TypeScript 介面與 API 資料格式
3. 📝 **Phase 1 Task 2**: Generate `contracts/*.yaml` - 定義 RESTful API + WebSocket 協議的 OpenAPI 規格
4. 📝 **Phase 1 Task 3**: Generate `quickstart.md` - 前端開發環境設置、程式碼範例、測試指令
5. 🔧 **Phase 1 Task 4**: Run `update-agent-context.ps1` - 更新 `.github/copilot-instructions.md` 加入本專案技術棧

---

## References

- [React Documentation](https://reactjs.org/docs/getting-started.html) - React 16.13 官方文檔
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Component testing philosophy
- [Cypress WebSocket Testing](https://docs.cypress.io/api/commands/request) - E2E real-time testing
- [React Query](https://tanstack.com/query/v3/) - Server state management
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) - Browser WebSocket documentation
