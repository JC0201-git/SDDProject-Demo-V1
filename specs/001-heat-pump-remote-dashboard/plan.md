# Implementation Plan: 熱泵遠端管理儀表板

**Branch**: `001-heat-pump-remote-dashboard` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-heat-pump-remote-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

建立一個網頁儀表板系統，讓管理人員能遠端監控熱泵設備的即時運作狀態、查看動態流程圖與歷史趨勢、並執行遠端控制指令。系統需接收設備主動推送的即時資料（<1秒延遲更新），支援100台以上設備同時連線，保留30天歷史資料供趨勢分析，並提供三級權限控制（檢視者/操作者/管理者）。技術方案採用前後端分離架構，後端處理即時數據流與控制指令，前端提供響應式介面支援跨裝置使用。

## Technical Context

**Language/Version**: 
- Frontend: React 16.13.1+ (might upgrade to 18.x - NEEDS CLARIFICATION)
- Backend: NEEDS CLARIFICATION (Node.js/Python/Go for WebSocket support)

**Primary Dependencies**: 
- Frontend: React, Context API, ECharts, react-hook-form, i18next, Bootstrap/Rsuite
- Backend: NEEDS CLARIFICATION (WebSocket/SSE library, REST framework)
- Real-time Communication: NEEDS CLARIFICATION (WebSocket vs Server-Sent Events)

**Storage**: 
- Time-series database for 30-day historical data - NEEDS CLARIFICATION (PostgreSQL with TimescaleDB extension vs InfluxDB vs TimescaleDB)
- User/device metadata - NEEDS CLARIFICATION (PostgreSQL vs MongoDB)
- Session storage - NEEDS CLARIFICATION (Redis for sessions?)

**Testing**: 
- Frontend: NEEDS CLARIFICATION (Jest + React Testing Library recommended)
- Backend: NEEDS CLARIFICATION (depends on language choice)
- E2E: NEEDS CLARIFICATION (Playwright/Cypress for critical flows)

**Target Platform**: Web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

**Project Type**: Web (frontend + backend)

**Performance Goals**: 
- Real-time data update latency <1s from device push to UI display
- Remote control command response <3s (network dependent)
- Dashboard initial load <3s
- Support 100+ concurrent device connections
- 30-day historical data query <2s

**Constraints**: 
- Must handle device offline/reconnection gracefully
- Must prevent stale data display (<5s timeout warning)
- Must work on mobile/tablet/desktop (responsive design)
- Must support idle timeout (30min) with session management
- Must handle 100+ devices without performance degradation

**Scale/Scope**: 
- 100+ heat pump devices monitored simultaneously
- 3-tier user permission system (viewer/operator/admin)
- Real-time monitoring + historical trends + remote control
- 30-day data retention window
- Multiple dashboard views (overview + device detail + trends)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Frontend Constitution Compliance

| Principle | Status | Implementation Requirements |
|-----------|--------|----------------------------|
| **I. Data Consumption** | ✓ PASS | Must implement unified request interceptors for device API, define TypeScript interfaces for all device data/control APIs, implement standardized error handling for network failures and device offline scenarios |
| **II. State Management** | ✓ PASS | Must distinguish: (1) Global State - user session, permissions, theme; (2) Local State - UI toggles, form inputs, dashboard filters; (3) Server Cache - real-time device data, historical trends. Must use React Query/SWR for device data caching and real-time updates |
| **III. Component Architecture** | ✓ PASS | Must follow Container-Presenter pattern: Dashboard pages as containers (data fetching), Device cards/charts/controls as presentational components (props-driven). Each component must have single responsibility |
| **IV. Defensive Development** | ✓ PASS | Critical for real-time system: Must implement skeleton screens for all loading states, empty states for no devices, error boundaries for component failures, graceful degradation for device offline, retry mechanisms for failed control commands, timeout warnings for stale data |
| **V. Documentation Language** | ✓ PASS | Feature specification already in Traditional Chinese |

**Gate Status**: ✅ **ALL GATES PASS** - No constitutional violations. All principles are compatible with the feature requirements and will be implemented during development.

**Notes**: 
- The real-time nature of this feature makes Defensive Development especially critical - must handle network interruptions, device failures, and data staleness gracefully
- Server Cache management is complex due to real-time data streams - React Query's WebSocket integration or manual cache invalidation strategies needed

### Post-Design Re-evaluation (Phase 1 Complete)

**Re-evaluation Date**: 2026年2月18日  
**Artifacts Reviewed**: data-model.md, contracts/, quickstart.md

| Principle | Phase 1 Design Verification | Status |
|-----------|----------------------------|--------|
| **I. Data Consumption** | ✓ API contracts define comprehensive REST + WebSocket endpoints with TypeScript schemas. Quickstart demonstrates unified axios interceptors and error handling patterns | ✅ MAINTAINED |
| **II. State Management** | ✓ Project structure clearly separates Global State (Context API), Server Cache (React Query hooks: useDeviceData, useRealtime), and Local State (component useState). Documented in quickstart.md | ✅ MAINTAINED |
| **III. Component Architecture** | ✓ Directory structure enforces Container-Presenter separation: pages/ (containers) vs components/ (presentational). All example code follows single responsibility principle | ✅ MAINTAINED |
| **IV. Defensive Development** | ✓ Quickstart includes LoadingSkeleton, ErrorMessage, OfflineIndicator components. All API call examples include error handling, retry logic, and timeout management | ✅ MAINTAINED |
| **V. Documentation Language** | ✓ All Phase 0 + Phase 1 documentation (research.md, data-model.md, quickstart.md) written in Traditional Chinese | ✅ MAINTAINED |

**Final Gate Status**: ✅ **ALL GATES MAINTAINED** - Design phase has successfully incorporated all constitutional principles. Ready for Phase 2 (Task Breakdown).

**Design Highlights**:
- WebSocket architecture (Socket.io) with automatic reconnection aligns with Defensive Development requirements
- React Query integration provides robust Server Cache management with automatic invalidation
- Comprehensive error handling patterns demonstrated in all code examples
- Clear architectural boundaries maintained throughout data model and API contracts

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── device.js            # Device entity model
│   │   ├── user.js              # User entity model
│   │   ├── component.js         # Component entity model
│   │   └── threshold.js         # Threshold configuration model
│   ├── services/
│   │   ├── device-service.js    # Device data management
│   │   ├── realtime-service.js  # WebSocket/SSE real-time data handling
│   │   ├── control-service.js   # Remote control command handling
│   │   ├── auth-service.js      # Authentication & session management
│   │   └── history-service.js   # Historical data queries
│   ├── api/
│   │   ├── routes/
│   │   │   ├── device.js        # Device CRUD endpoints
│   │   │   ├── realtime.js      # Real-time data streaming endpoints
│   │   │   ├── control.js       # Control command endpoints
│   │   │   └── auth.js          # Authentication endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT validation & permission check
│   │   │   └── error-handler.js # Unified error handling
│   │   └── validators/          # Request validation schemas
│   ├── db/
│   │   ├── migrations/          # Database schema migrations
│   │   └── connection.js        # Database connection pooling
│   └── config/
│       ├── database.js          # DB configuration
│       └── server.js            # Server configuration
├── tests/
│   ├── unit/                    # Service & model unit tests
│   ├── integration/             # API endpoint integration tests
│   └── fixtures/                # Test data fixtures
└── package.json

frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DeviceOverview.jsx       # Presentational: device summary cards
│   │   │   ├── DeviceList.jsx           # Presentational: device list with status
│   │   │   ├── DeviceStatusIndicator.jsx # Presentational: status light (red/green/gray)
│   │   │   └── GlobalMetrics.jsx        # Presentational: total power/COP display
│   │   ├── device/
│   │   │   ├── DeviceFlowDiagram.jsx    # Presentational: animated flow diagram
│   │   │   ├── ComponentStatus.jsx      # Presentational: component list display
│   │   │   ├── ParameterCard.jsx        # Presentational: single parameter display
│   │   │   └── TrendChart.jsx           # Presentational: ECharts trend visualization
│   │   ├── control/
│   │   │   ├── ModeSwitch.jsx           # Presentational: auto/manual mode toggle
│   │   │   ├── ParameterInput.jsx       # Presentational: target parameter input
│   │   │   └── ConfirmDialog.jsx        # Presentational: confirmation modal
│   │   ├── common/
│   │   │   ├── LoadingSkeleton.jsx      # Presentational: loading state
│   │   │   ├── EmptyState.jsx           # Presentational: no data state
│   │   │   ├── ErrorMessage.jsx         # Presentational: error display
│   │   │   └── OfflineIndicator.jsx     # Presentational: device offline banner
│   │   └── layout/
│   │       ├── Header.jsx               # Presentational: top navigation
│   │       ├── Sidebar.jsx              # Presentational: device selection sidebar
│   │       └── ResponsiveContainer.jsx  # Presentational: responsive layout wrapper
│   ├── pages/
│   │   ├── DashboardPage.jsx            # Container: global dashboard orchestration
│   │   ├── DeviceDetailPage.jsx         # Container: single device detail orchestration
│   │   ├── TrendsPage.jsx               # Container: historical trends orchestration
│   │   └── LoginPage.jsx                # Container: authentication flow
│   ├── services/
│   │   ├── api/
│   │   │   ├── device-api.js            # Device API calls with TypeScript interfaces
│   │   │   ├── control-api.js           # Control API calls
│   │   │   ├── history-api.js           # Historical data API calls
│   │   │   ├── auth-api.js              # Authentication API calls
│   │   │   ├── interceptors.js          # Unified request/response interceptors
│   │   │   └── error-handler.js         # API error handling logic
│   │   ├── websocket/
│   │   │   └── realtime-connection.js   # WebSocket connection management
│   │   └── utils/
│   │       ├── data-validator.js        # Data anomaly detection
│   │       └── retry-logic.js           # Exponential backoff retry
│   ├── hooks/
│   │   ├── useDeviceData.js             # React Query hook for device data
│   │   ├── useRealtime.js               # Hook for WebSocket real-time data
│   │   ├── useControlCommand.js         # Hook for control command mutation
│   │   └── useAuth.js                   # Hook for authentication state
│   ├── context/
│   │   ├── AppContext.js                # Global: theme, layout, language
│   │   └── AuthContext.js               # Global: user session, permissions
│   ├── config/
│   │   └── api-config.js                # API base URL, timeout settings
│   └── App.jsx                          # Root component with routing
├── tests/
│   ├── unit/                            # Component unit tests (Jest + RTL)
│   ├── integration/                     # Page integration tests
│   └── e2e/                             # Critical user journey E2E tests
└── package.json
```

**Structure Decision**: Web application with frontend + backend separation (Option 2). The frontend follows Container-Presenter pattern with clear separation between pages (containers) that handle data fetching and components (presentational) that receive props. The backend follows service layer pattern with separate concerns for real-time data streaming, control commands, and historical queries. This structure supports the real-time requirements while maintaining testability and maintainability.

## Complexity Tracking

No constitutional violations identified. All architectural decisions align with the Demo-v1 Frontend Constitution principles.
