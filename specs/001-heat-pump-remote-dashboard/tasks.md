---
description: "Task list for Heat Pump Remote Dashboard (Frontend)"
---

# Tasks: 熱泵遠端管理儀表板

**Feature Branch**: `001-heat-pump-remote-dashboard`  
**Input**: Design documents from `/specs/001-heat-pump-remote-dashboard/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**MVP Scope**: User Story 1 + User Story 2 (P1 priorities) provide core monitoring value

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project using Create React App with TypeScript template
- [ ] T002 [P] Install dependencies: react-query@3.39.3, react-bootstrap@2.7.0, react-router-dom@5.3.4
- [ ] T003 [P] Install chart libraries: echarts@5.2.2, echarts-for-react@3.0.2
- [ ] T004 [P] Install i18n: react-i18next@11.18+, i18next@21.10+
- [ ] T005 [P] Install testing: @testing-library/react@14+, cypress@13+, @axe-core/react
- [ ] T006 [P] Configure ESLint and Prettier per Frontend-web.md standards
- [ ] T007 Create project folder structure: src/components/DemoV1/HeatPump/, src/pages/DemoV1/HeatPump/, src/services/, src/context/, src/hooks/, src/types/
- [ ] T008 Configure tsconfig.json with strict type checking enabled
- [ ] T009 Setup React Query client configuration in src/config/queryClient.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### TypeScript Type Definitions

- [ ] T010 [P] Create User & UserSession interfaces in src/types/heatpump.ts
- [ ] T011 [P] Create Device & DeviceSummary interfaces in src/types/heatpump.ts
- [ ] T012 [P] Create Component interface in src/types/heatpump.ts
- [ ] T013 [P] Create RealtimeData interface in src/types/heatpump.ts
- [ ] T014 [P] Create HistoricalData & HistoricalDataQuery interfaces in src/types/heatpump.ts
- [ ] T015 [P] Create ControlCommand & ControlCommandCreate interfaces in src/types/heatpump.ts
- [ ] T016 [P] Create ThresholdConfig interface in src/types/heatpump.ts
- [ ] T017 [P] Create OperationLog interface in src/types/heatpump.ts

### Authentication & Permission Framework

- [ ] T018 Create UserContext provider in src/context/UserContext.tsx with login/logout methods
- [ ] T019 Create PermissionContext provider in src/context/PermissionContext.tsx with hasPermission() function
- [ ] T020 Create useUser custom hook in src/hooks/useUser.ts
- [ ] T021 Create usePermission custom hook in src/hooks/usePermission.ts
- [ ] T022 Create RequirePermission component in src/components/DemoV1/common/RequirePermission.tsx

### API Service Layer

- [ ] T023 Create HeatPumpService.ts base file with axios instance in src/services/HeatPumpService.ts
- [ ] T024 Implement request interceptor for authentication token in src/services/HeatPumpService.ts
- [ ] T025 Implement response interceptor for error handling (4xx/5xx → toast) in src/services/HeatPumpService.ts
- [ ] T026 [P] Implement login() and logout() methods in src/services/HeatPumpService.ts
- [ ] T027 [P] Implement getDevices() method in src/services/HeatPumpService.ts
- [ ] T028 [P] Implement getDeviceSummary() method in src/services/HeatPumpService.ts

### Routing & Layout

- [ ] T029 Setup React Router configuration in src/App.tsx
- [ ] T030 Create main layout component with navigation in src/components/DemoV1/common/Layout.tsx
- [ ] T031 Create protected route wrapper in src/components/DemoV1/common/ProtectedRoute.tsx
- [ ] T032 Configure i18n with zh-TW locale files in public/locales/zh-TW/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 即時監控設備狀態 (Priority: P1) 🎯 MVP

**Goal**: 管理人員可透過網頁瀏覽器查看所有熱泵設備的即時運作狀態，包括哪些設備在線上、正常運作或異常

**Independent Test**: 開啟儀表板，驗證能看到所有設備清單、狀態指示燈（綠/紅/灰）、在線設備數量、總耗電量、總產熱量、平均COP值

**Related Requirements**: FR-001, FR-002, FR-003, FR-004, FR-023, FR-024, FR-025

### Implementation for User Story 1

- [ ] T033 [P] [US1] Create DeviceStatusCard component in src/components/DemoV1/HeatPump/DeviceStatusCard.tsx
- [ ] T034 [P] [US1] Create SummaryCards component for metrics display in src/components/DemoV1/HeatPump/SummaryCards.tsx
- [ ] T035 [US1] Create Dashboard page in src/pages/DemoV1/HeatPump/Dashboard.tsx
- [ ] T036 [US1] Implement useDevices hook with React Query in src/hooks/useDevices.ts
- [ ] T037 [US1] Implement useDeviceSummary hook with React Query in src/hooks/useDeviceSummary.ts
- [ ] T038 [US1] Integrate DeviceStatusCard with device data and status indicators (green/red/gray)
- [ ] T039 [US1] Implement 5-second auto-refresh for device list using React Query refetchInterval
- [ ] T040 [US1] Add Skeleton loading states for Dashboard in src/components/DemoV1/HeatPump/DashboardSkeleton.tsx
- [ ] T041 [US1] Add Empty State component when no devices in src/components/DemoV1/HeatPump/EmptyDeviceList.tsx
- [ ] T042 [US1] Implement permission-based UI rendering (hide controls for viewers) in Dashboard
- [ ] T043 [US1] Add device list filtering by status (online/offline/error) in Dashboard

**Checkpoint**: At this point, User Story 1 should be fully functional - users can view all devices and their real-time status

---

## Phase 4: User Story 2 - 檢視設備運作細節 (Priority: P1) 🎯 MVP

**Goal**: 管理人員可查看單一設備的詳細運作資訊，包括動態流程圖、各元件狀態、即時參數及其歷史趨勢

**Independent Test**: 選擇一台設備，驗證能看到動態流程圖（含動態效果）、元件狀態清單、即時參數數值、過去1小時溫度趨勢圖

**Related Requirements**: FR-005, FR-006, FR-007, FR-009, FR-016, FR-017, FR-018, FR-022

### Implementation for User Story 2

#### WebSocket & Real-time Data
- [ ] T044 [P] [US2] Create useDeviceRealtime hook with WebSocket connection in src/hooks/useDeviceRealtime.ts
- [ ] T045 [US2] Implement auto-reconnect logic with exponential backoff in useDeviceRealtime hook
- [ ] T046 [US2] Implement connection status tracking (connecting/connected/disconnected) in useDeviceRealtime hook
- [ ] T047 [US2] Add heartbeat mechanism (ping/pong every 30 seconds) in useDeviceRealtime hook

#### Components
- [ ] T048 [P] [US2] Create ComponentStatus component in src/components/DemoV1/HeatPump/ComponentStatus.tsx
- [ ] T049 [P] [US2] Create DynamicFlowDiagram component with SVG in src/components/DemoV1/HeatPump/DynamicFlowDiagram.tsx
- [ ] T050 [P] [US2] Create TrendChart component with ECharts in src/components/DemoV1/HeatPump/TrendChart.tsx
- [ ] T051 [P] [US2] Create ParameterDisplay component for real-time values in src/components/DemoV1/HeatPump/ParameterDisplay.tsx
- [ ] T052 [US2] Create DeviceDetail page in src/pages/DemoV1/HeatPump/DeviceDetail.tsx

#### Integration
- [ ] T053 [US2] Implement getDeviceById() method in src/services/HeatPumpService.ts
- [ ] T054 [US2] Implement getDeviceComponents() method in src/services/HeatPumpService.ts
- [ ] T055 [US2] Integrate WebSocket real-time data with DeviceDetail page
- [ ] T056 [US2] Add dynamic effects to flow diagram (animated arrows, color changes based on temperature)
- [ ] T057 [US2] Implement 1-hour trend chart with temperature data from WebSocket
- [ ] T058 [US2] Add anomaly detection visualization (red segments on trend chart when threshold exceeded)
- [ ] T059 [US2] Add connection status indicator in DeviceDetail header
- [ ] T060 [US2] Implement data quality filtering (filter out anomaly data from trend chart per FR-022)
- [ ] T061 [US2] Add error boundary for WebSocket disconnection with retry button
- [ ] T062 [US2] Link DeviceStatusCard in Dashboard to DeviceDetail page via React Router

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can monitor and drill into device details

---

## Phase 5: User Story 3 - 遠端控制設備運作 (Priority: P2)

**Goal**: 管理人員可透過網頁介面遠端調整設備運作模式（自動/手動）和參數（目標水溫），無需親臨現場

**Independent Test**: 切換設備模式、調整目標參數，驗證指令成功送達並收到確認回應，設備行為按照新指令運作

**Related Requirements**: FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-019, FR-024, FR-025

### Implementation for User Story 3

#### Control Components
- [ ] T063 [P] [US3] Create ControlPanel component in src/components/DemoV1/HeatPump/ControlPanel.tsx
- [ ] T064 [P] [US3] Create ConfirmDialog component in src/components/DemoV1/common/ConfirmDialog.tsx
- [ ] T065 [P] [US3] Create ModeSwitch component in src/components/DemoV1/HeatPump/ModeSwitch.tsx
- [ ] T066 [P] [US3] Create TargetTempInput component in src/components/DemoV1/HeatPump/TargetTempInput.tsx

#### Control Logic
- [ ] T067 [US3] Create useDeviceControl hook with React Query mutations in src/hooks/useDeviceControl.ts
- [ ] T068 [US3] Implement sendControlCommand() method in src/services/HeatPumpService.ts
- [ ] T069 [US3] Implement getControlCommandStatus() method in src/services/HeatPumpService.ts
- [ ] T070 [US3] Add RemoteControl page or integrate ControlPanel into DeviceDetail in src/pages/DemoV1/HeatPump/RemoteControl.tsx

#### Permission & Validation
- [ ] T071 [US3] Implement permission check: only OPERATOR and ADMIN can see controls
- [ ] T072 [US3] Add confirmation dialog before mode switch (FR-015)
- [ ] T073 [US3] Add confirmation dialog before parameter change (FR-015)
- [ ] T074 [US3] Implement loading indicator during command transmission ("指令傳送中")
- [ ] T075 [US3] Implement 3-second timeout for command confirmation (FR-014)
- [ ] T076 [US3] Disable controls when device is offline (FR-017)
- [ ] T077 [US3] Add success toast notification "指令已送出"
- [ ] T078 [US3] Add error toast notification for failures
- [ ] T079 [US3] Implement command status polling until confirmed
- [ ] T080 [US3] Add operation log recording integration

**Checkpoint**: All P1 and P2 stories complete - users can monitor, drill down, and control devices

---

## Phase 6: User Story 5 - 跨裝置使用體驗一致性 (Priority: P2)

**Goal**: 管理人員可在不同裝置上（桌機、平板、手機）使用儀表板，介面根據螢幕大小自動調整版面

**Independent Test**: 在不同螢幕尺寸的裝置上開啟儀表板，驗證介面元素適當調整、按鈕易於點擊

**Related Requirements**: FR-020, FR-021

### Implementation for User Story 5

- [ ] T081 [P] [US5] Implement responsive layout for Dashboard using React-Bootstrap Grid in src/pages/DemoV1/HeatPump/Dashboard.tsx
- [ ] T082 [P] [US5] Implement responsive layout for DeviceDetail using React-Bootstrap Grid in src/pages/DemoV1/HeatPump/DeviceDetail.tsx
- [ ] T083 [P] [US5] Optimize DynamicFlowDiagram for mobile (simplified version or horizontal scroll)
- [ ] T084 [P] [US5] Ensure all buttons are ≥ 44x44px for touch targets (FR-021)
- [ ] T085 [US5] Adjust navigation for mobile (collapsible menu)
- [ ] T086 [US5] Test on tablet (768x1024) - device list as expandable menu, vertical layout
- [ ] T087 [US5] Test on mobile (375x667) - vertical stacking, dropdown device selector
- [ ] T088 [US5] Add touch feedback for buttons (color change on tap)
- [ ] T089 [US5] Implement conditional rendering for mobile (hide/show components based on viewport)
- [ ] T090 [US5] Run Lighthouse accessibility audit and fix issues

**Checkpoint**: Dashboard works seamlessly across desktop, tablet, and mobile devices

---

## Phase 7: User Story 4 - 歷史資料分析與趨勢觀察 (Priority: P3)

**Goal**: 管理人員可查看設備歷史資料，包括參數在過去數小時或數天的變化趨勢，判斷設備運作穩定性

**Independent Test**: 選擇不同時間範圍（1小時、6小時、24小時、7天），驗證系統顯示對應時段的歷史趨勢圖表

**Related Requirements**: FR-007, FR-008

### Implementation for User Story 4

- [ ] T091 [P] [US4] Create TimeRangeSelector component in src/components/DemoV1/HeatPump/TimeRangeSelector.tsx
- [ ] T092 [P] [US4] Create ParameterSelector component (checkboxes for pressure/temp/frequency) in src/components/DemoV1/HeatPump/ParameterSelector.tsx
- [ ] T093 [US4] Implement getHistoricalData() method in src/services/HeatPumpService.ts
- [ ] T094 [US4] Create useHistoricalData hook with React Query in src/hooks/useHistoricalData.ts
- [ ] T095 [US4] Enhance TrendChart to support multiple time ranges (1h, 6h, 24h, 7d, 30d)
- [ ] T096 [US4] Implement multi-parameter overlay (display 3 lines with different colors)
- [ ] T097 [US4] Add zoom functionality to TrendChart (click-drag to zoom in)
- [ ] T098 [US4] Add data aggregation display (show max/min/avg for selected range)
- [ ] T099 [US4] Integrate historical data view into DeviceDetail page
- [ ] T100 [US4] Add loading skeleton for historical data queries

**Checkpoint**: All user stories (P1, P2, P3) are complete

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall quality

### Error Handling & Loading States
- [ ] T101 [P] Review and enhance error handling across all API calls
- [ ] T102 [P] Ensure all loading states have Skeleton components
- [ ] T103 [P] Verify all empty states have actionable guidance
- [ ] T104 Implement global error boundary in src/App.tsx

### Performance Optimization
- [ ] T105 [P] Implement virtual scrolling for device list (if > 100 devices)
- [ ] T106 [P] Optimize ECharts rendering with data sampling for large datasets
- [ ] T107 [P] Add React.memo to frequently re-rendered components
- [ ] T108 Measure and optimize bundle size (ensure < 1MB gzipped)

### Testing & Quality
- [ ] T109 [P] Write unit tests for all custom hooks (useDeviceRealtime, useDeviceControl, usePermission)
- [ ] T110 [P] Write Cypress E2E test for login → dashboard → device detail journey
- [ ] T111 [P] Write Cypress E2E test for remote control command flow
- [ ] T112 Run axe-core accessibility tests on all pages and fix violations
- [ ] T113 Verify 85%+ code coverage target

### Documentation & Deployment
- [ ] T114 [P] Document environment variables in .env.example
- [ ] T115 [P] Create deployment guide in docs/deployment.md
- [ ] T116 Verify quickstart.md instructions are accurate
- [ ] T117 Add JSDoc comments to all public APIs in services/

### i18n & Browser Compatibility
- [ ] T118 [P] Complete Traditional Chinese translations for all UI strings
- [ ] T119 [P] Test on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- [ ] T120 Add browser version detection and upgrade prompt for unsupported browsers

**Checkpoint**: Production-ready frontend application

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3) can start after Foundational
  - US2 (Phase 4) can start after Foundational, minimal dependency on US1 (routing link)
  - US3 (Phase 5) can start after Foundational, leverages US2 DeviceDetail page
  - US5 (Phase 6) enhances existing pages, depends on US1 & US2 completion
  - US4 (Phase 7) enhances US2, depends on TrendChart from US2
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories - can start after Foundational ✅
- **US2 (P1)**: Minimal dependency on US1 (routing from dashboard to detail page)
- **US3 (P2)**: Leverages US2 DeviceDetail page to embed ControlPanel
- **US5 (P2)**: Enhances US1 & US2 with responsive design
- **US4 (P3)**: Extends US2 TrendChart with historical data

### Within Each User Story

- TypeScript interfaces before hooks/services
- Hooks/services before components
- Components before pages
- Core implementation before integration
- Permission checks after core functionality
- Testing after implementation

### Parallel Opportunities Per Phase

**Phase 1 (Setup)**: T002, T003, T004, T005, T006 can run in parallel

**Phase 2 (Foundational)**: 
- T010-T017 (all TypeScript interfaces) can run in parallel
- T026-T028 (API methods) can run in parallel

**Phase 3 (US1)**: T033, T034 can run in parallel

**Phase 4 (US2)**: 
- T044, T047 (WebSocket logic) can run in parallel with
- T048, T049, T050, T051 (all components) in parallel

**Phase 5 (US3)**: T063, T064, T065, T066 (all components) can run in parallel

**Phase 6 (US5)**: T081, T082, T083, T084 can run in parallel

**Phase 7 (US4)**: T091, T092 can run in parallel

**Phase 8 (Polish)**: T101-T103, T105-T107, T109-T111, T114-T115, T118-T119 can run in parallel

---

## Parallel Example: User Story 2

```bash
# Phase 4 parallel work - 4 developers can work simultaneously:

Developer A: 
  T044 - useDeviceRealtime hook
  T045 - Auto-reconnect logic
  T046 - Connection status tracking
  T047 - Heartbeat mechanism

Developer B:
  T048 - ComponentStatus component
  T049 - DynamicFlowDiagram component

Developer C:
  T050 - TrendChart component
  T051 - ParameterDisplay component

Developer D:
  T053 - getDeviceById() API method
  T054 - getDeviceComponents() API method
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 → **Test independently**
4. Complete Phase 4: User Story 2 → **Test independently**
5. **MVP COMPLETE** - Deploy/demo core monitoring capabilities

### Incremental Delivery

1. **Release 1**: Setup + Foundational + US1 + US2 (MVP - Core Monitoring)
2. **Release 2**: Add US3 (Remote Control)
3. **Release 3**: Add US5 (Responsive Design)
4. **Release 4**: Add US4 (Historical Analysis)
5. **Release 5**: Polish & optimization

### Parallel Team Strategy (5 developers)

**Week 1**: All developers complete Setup + Foundational together

**Week 2-3** (After Foundational complete):
- Developer A: User Story 1 (Phase 3)
- Developer B + C: User Story 2 (Phase 4) - parallel component work
- Developer D: User Story 3 (Phase 5) - can start early on components
- Developer E: Testing infrastructure + documentation

**Week 4+**: Integration, US5, US4, Polish

---

## Task Summary

- **Total Tasks**: 120
- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 23 tasks - BLOCKS all user stories
- **Phase 3 (US1 - P1)**: 11 tasks - MVP
- **Phase 4 (US2 - P1)**: 19 tasks - MVP
- **Phase 5 (US3 - P2)**: 18 tasks
- **Phase 6 (US5 - P2)**: 10 tasks
- **Phase 7 (US4 - P3)**: 10 tasks
- **Phase 8 (Polish)**: 20 tasks

**MVP Scope**: 62 tasks (Phase 1 + 2 + 3 + 4)

**Parallel Opportunities**: 47 tasks marked [P] can run in parallel within their phase

**Independent Stories**: Each user story delivers value independently and can be tested/deployed separately

---

## Notes

- All file paths use Demo-v1-web/src/ as base directory per plan.md
- TypeScript interfaces defined in src/types/heatpump.ts per data-model.md
- Components follow DemoV1/HeatPump/ naming convention per quickstart.md
- [P] markers indicate tasks that can be parallelized (different files, no dependencies)
- [Story] labels map tasks to user stories for traceability
- Stop at any checkpoint to validate story works independently
- Tests not included (not explicitly requested in spec.md)
- Each user story is independently completable and testable per speckit.tasks requirements
