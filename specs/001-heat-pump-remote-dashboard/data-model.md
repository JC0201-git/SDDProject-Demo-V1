# Data Model:熱泵遠端管理儀表板（前端）

**Date**: 2026-02-17  
**Phase**: 1 - Design & Contracts  
**Input**: 關鍵實體 from spec.md + research.md technical decisions

## Overview

本文檔定義熱泵遠端管理儀表板的前端資料模型，包含 TypeScript 介面定義、API 資料格式、及狀態管理結構。設計遵循 Constitution 原則：明確區分 Server Cache（設備資料）、Global State（使用者 session）、Local State（UI 狀態）。

## State Management Architecture

根據 research.md 決策，採用以下狀態管理策略：

- **Server Cache (React Query)**: 設備資料、即時數據、歷史趨勢 → 使用 `useQuery` / `useMutation`
- **Global State (Context API)**: 使用者 session、權限資訊 → 使用 `UserContext`
- **Local State (useState)**: UI 臨時狀態（對話框、表單輸入） → 使用 `useState`

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐
│    User     │◄────────│ OperationLog     │
│  (使用者)   │ records │   (操作紀錄)      │
└──────┬──────┘         └──────────────────┘
       │                         │
       │                         │ references
       │                         │
       │ creates                 ▼
       │                 ┌──────────────────┐
       │                 │ ControlCommand   │
       │                 │   (控制指令)      │
       │                 └────────┬─────────┘
       │                          │
       │                          │ targets
       │                          │
       ▼                          ▼
┌─────────────┐         ┌──────────────────┐
│ ThresholdCfg│◄────────│     Device       │
│ (閥值配置)   │ belongs │    (設備)         │
└─────────────┘   to    └────────┬─────────┘
                                 │
                                 │ has many
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
       ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
       │ Component   │  │ RealtimeData │  │HistoricalData│
       │  (元件)      │  │ (即時資料)    │  │ (歷史資料)    │
       └─────────────┘  └──────────────┘  └──────────────┘
```

---

## 1. User (使用者)

**用途**: 系統管理人員帳號，支援三級權限控制（FR-023, FR-024, FR-026）

**State Category**: Global State (Context API)

### TypeScript Interface

```typescript
export enum UserRole {
  VIEWER = 'viewer',      // 僅查看
  OPERATOR = 'operator',  // 可控制設備
  ADMIN = 'admin'         // 完整權限
}

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;  // ISO 8601 timestamp
  createdAt: string;
}

export interface UserSession {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  token: string;
  expiresAt: string;
}
```

### Usage Example

```typescript
// Context for Global State
const UserContext = createContext<UserSession | null>(null);

// Custom hook
function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error('User not authenticated');
  return user;
}

// Permission check
function hasPermission(user: UserSession, action: string): boolean {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.OPERATOR && action.startsWith('control:')) return true;
  if (action.startsWith('view:')) return true;
  return false;
}
```

---

## 2. Device (設備)

**用途**: 代表一台熱泵設備，記錄設備基本資訊及當前狀態（FR-003, FR-004）

**State Category**: Server Cache (React Query)

### TypeScript Interface

```typescript
export enum DeviceStatus {
  ONLINE = 'online',    // 在線
  OFFLINE = 'offline',  // 離線
  RUNNING = 'running',  // 運作中
  STOPPED = 'stopped',  // 停止
  ERROR = 'error'       // 異常
}

export enum DeviceMode {
  AUTO = 'auto',      // 自動模式
  MANUAL = 'manual'   // 手動模式
}

export interface Device {
  id: string;
  deviceCode: string;
  name: string;
  location?: string;
  status: DeviceStatus;
  mode: DeviceMode;
  
  // Current snapshot (即時快照)
  currentCompressorFrequency?: number;
  currentTemperatureExhaust?: number;
  currentTemperatureIntake?: number;
  currentPressure?: number;
  currentTemperatureWaterTank?: number;
  currentTargetTemperature?: number;
  currentPowerKw?: number;
  currentHeatOutputKw?: number;
  currentCop?: number;
  
  lastDataAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  runningDevices: number;
  errorDevices: number;
  totalPowerKw: number;
  totalHeatOutputKw: number;
  averageCop: number;
}
```

### Usage Example

```typescript
// React Query for Server Cache
function useDevices() {
  return useQuery('devices', async () => {
    const response = await fetch('/api/devices');
    return response.json() as Device[];
  });
}

function useDeviceSummary() {
  return useQuery('device-summary', async () => {
    const response = await fetch('/api/devices/summary');
    return response.json() as DeviceSummary;
  });
}
```

---

## 3. Component (元件)

**用途**: 設備內子元件狀態（風扇、幫浦、壓縮機等），FR-006 要求顯示元件狀態

**State Category**: Server Cache (React Query)

### TypeScript Interface

```typescript
export enum ComponentStatus {
  RUNNING = 'running', // 運轉中
  STOPPED = 'stopped', // 停止
  ERROR = 'error'      // 異常
}

export interface Component {
  id: string;
  deviceId: string;
  componentCode: string;
  componentType: string;
  name: string;
  status: ComponentStatus;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Usage Example

```typescript
function useDeviceComponents(deviceId: string) {
  return useQuery(['device-components', deviceId], async () => {
    const response = await fetch(`/api/devices/${deviceId}/components`);
    return response.json() as Component[];
  });
}
```

---

## 4. RealtimeData (即時資料)

**用途**: 設備回報的即時監測數據（FR-001, FR-002），透過 WebSocket 推送

**State Category**: Local State (useState) + WebSocket

### TypeScript Interface

```typescript
export enum DataQuality {
  NORMAL = 'normal',   // 正常
  ANOMALY = 'anomaly'  // 異常
}

export interface RealtimeData {
  time: string;  // ISO 8601
  deviceId: string;
  compressorFrequency?: number;
  temperatureExhaust?: number;
  temperatureIntake?: number;
  temperatureWaterTank?: number;
  pressure?: number;
  powerKw?: number;
  heatOutputKw?: number;
  cop?: number;
  dataQuality: DataQuality;
  metadata?: Record<string, any>;
}
```

### Usage Example

```typescript
// Custom hook for WebSocket
function useDeviceRealtime(deviceId: string) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/devices/${deviceId}`);
    
    ws.onopen = () => setStatus('connected');
    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data) as RealtimeData;
      setData(newData);
    };
    ws.onerror = () => {
      toast.error('連線中斷，請檢查網路');
      setStatus('disconnected');
    };
    ws.onclose = () => setStatus('disconnected');
    
    return () => ws.close();
  }, [deviceId]);
  
  return { data, status };
}
```

---

## 5. HistoricalData (歷史資料)

**用途**: 聚合後的歷史趨勢資料（FR-007），用於繪製趨勢圖表

**State Category**: Server Cache (React Query)

### TypeScript Interface

```typescript
export interface HistoricalData {
  timestamp: string;
  deviceId: string;
  avgCompressorFrequency?: number;
  avgTemperatureExhaust?: number;
  avgTemperatureIntake?: number;
  avgTemperatureWaterTank?: number;
  avgPressure?: number;
  avgPowerKw?: number;
  avgHeatOutputKw?: number;
  avgCop?: number;
  maxTemperatureExhaust?: number;
  minTemperatureExhaust?: number;
}

export interface HistoricalDataQuery {
  deviceId: string;
  startTime: string;
  endTime: string;
  interval: '1min' | '1hour' | '1day';
  parameters: string[];
}
```

### Usage Example

```typescript
function useHistoricalData(query: HistoricalDataQuery) {
  return useQuery(['historical-data', query], async () => {
    const response = await fetch('/api/historical-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    return response.json() as HistoricalData[];
  });
}
```

---

## 6. ControlCommand (控制指令)

**用途**: 遠端控制指令紀錄（FR-012, FR-013, FR-014），追蹤指令執行狀態

**State Category**: Server Cache (React Query) + Mutation

### TypeScript Interface

```typescript
export enum CommandType {
  SWITCH_MODE = 'switch_mode',
  SET_TARGET_TEMP = 'set_target_temp',
  EMERGENCY_STOP = 'emergency_stop'
}

export enum CommandStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  TIMEOUT = 'timeout',
  FAILED = 'failed'
}

export interface ControlCommand {
  id: string;
  deviceId: string;
  userId: string;
  commandType: CommandType;
  commandPayload: Record<string, any>;
  status: CommandStatus;
  sentAt?: string;
  confirmedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface ControlCommandCreate {
  deviceId: string;
  commandType: CommandType;
  commandPayload: Record<string, any>;
}
```

### Usage Example

```typescript
function useSendControlCommand() {
  return useMutation(
    async (command: ControlCommandCreate) => {
      const response = await fetch('/api/control/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });
      return response.json() as ControlCommand;
    },
    {
      onSuccess: () => {
        toast.success('指令已送出');
      },
      onError: (error) => {
        toast.error('指令送出失敗，請稍後再試');
      }
    }
  );
}
```

---

## 7. ThresholdConfig (閥值配置)

**用途**: 異常偵測閥值設定（FR-009, FR-010, FR-011），每台設備可自訂或使用預設值

**State Category**: Server Cache (React Query)

### TypeScript Interface

```typescript
export interface ThresholdConfig {
  id: string;
  deviceId: string;
  parameterName: string;
  upperLimit?: number;
  lowerLimit?: number;
  useDefault: boolean;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ThresholdConfigUpdate {
  parameterName: string;
  upperLimit: number;
  lowerLimit: number;
  useDefault: boolean;
}

export interface DefaultThreshold {
  parameterName: string;
  upperLimit: number;
  lowerLimit: number;
  description: string;
}
```

### Usage Example

```typescript
function useThresholdConfigs(deviceId: string) {
  return useQuery(['threshold-configs', deviceId], async () => {
    const response = await fetch(`/api/devices/${deviceId}/thresholds`);
    return response.json() as ThresholdConfig[];
  });
}

function useUpdateThreshold(deviceId: string) {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (update: ThresholdConfigUpdate) => {
      const response = await fetch(`/api/devices/${deviceId}/thresholds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['threshold-configs', deviceId]);
        toast.success('閾值已更新');
      }
    }
  );
}
```

---

## 8. OperationLog (操作紀錄)

**用途**: 審計記錄所有遠端控制操作（FR-019），追蹤誰在何時執行何操作

**State Category**: Server Cache (React Query)

### TypeScript Interface

```typescript
export interface OperationLog {
  id: string;
  userId: string;
  deviceId?: string;
  operationType: string;
  operationDetail: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface OperationLogQuery {
  userId?: string;
  deviceId?: string;
  operationType?: string;
  startTime?: string;
  endTime?: string;
  page: number;
  pageSize: number;
}
```

### Usage Example

```typescript
function useOperationLogs(query: OperationLogQuery) {
  return useQuery(['operation-logs', query], async () => {
    const params = new URLSearchParams(query as any);
    const response = await fetch(`/api/operation-logs?${params}`);
    return response.json() as OperationLog[];
  });
}
```

---

## State Management Summary

| Entity | State Category | Tool | Rationale |
|--------|---------------|------|-----------|
| User Session | Global State | Context API | 所有頁面需存取，變動頻率低 |
| Device List | Server Cache | React Query | API 資料，需快取與重新驗證 |
| Realtime Data | Local State + WebSocket | useState | 即時推送，不需快取 |
| Historical Data | Server Cache | React Query | API 資料，依查詢參數快取 |
| Control Command | Server Cache + Mutation | React Query | API 操作，需追蹤狀態 |
| Threshold Config | Server Cache | React Query | API 資料，低頻變動 |
| Operation Logs | Server Cache | React Query | API 資料，分頁載入 |
| UI State (對話框、表單) | Local State | useState | 臨時狀態，無需跨元件 |

---

## API Integration Patterns

### 1. Data Fetching with React Query

```typescript
// services/HeatPumpService.ts
export const HeatPumpService = {
  async getDevices(): Promise<Device[]> {
    const response = await fetch('/api/devices', {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch devices');
    return response.json();
  },
  
  async getDeviceSummary(): Promise<DeviceSummary> {
    const response = await fetch('/api/devices/summary');
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  }
};

// In component
function Dashboard() {
  const { data: summary, isLoading, error } = useQuery(
    'device-summary',
    HeatPumpService.getDeviceSummary,
    { refetchInterval: 5000 } // 每 5 秒更新
  );
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return <SummaryCards summary={summary} />;
}
```

### 2. WebSocket Integration

```typescript
// hooks/useDeviceRealtime.ts
export function useDeviceRealtime(deviceId: string) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const reconnectIntervalRef = useRef(1000);
  
  useEffect(() => {
    let ws: WebSocket;
    
    const connect = () => {
      ws = new WebSocket(`${WS_BASE_URL}/devices/${deviceId}`);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectIntervalRef.current = 1000;
      };
      
      ws.onmessage = (event) => {
        const newData = JSON.parse(event.data) as RealtimeData;
        setData(newData);
      };
      
      ws.onerror = () => {
        setConnectionStatus('disconnected');
      };
      
      ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Auto-reconnect with exponential backoff
        setTimeout(() => {
          if (reconnectIntervalRef.current < 60000) {
            reconnectIntervalRef.current *= 2;
          }
          connect();
        }, reconnectIntervalRef.current);
      };
    };
    
    connect();
    return () => ws?.close();
  }, [deviceId]);
  
  return { data, connectionStatus };
}
```

### 3. Permission-Based Rendering

```typescript
// context/PermissionContext.tsx
export const PermissionContext = createContext<{
  hasPermission: (action: string) => boolean;
} | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  
  const hasPermission = useCallback((action: string) => {
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.OPERATOR && action.startsWith('control:')) return true;
    if (action.startsWith('view:')) return true;
    return false;
  }, [user]);
  
  return (
    <PermissionContext.Provider value={{ hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

// Usage in component
function ControlPanel({ deviceId }: { deviceId: string }) {
  const { hasPermission } = useContext(PermissionContext);
  
  if (!hasPermission('control:device')) {
    return null; // Or show read-only view
  }
  
  return <ControlButtons deviceId={deviceId} />;
}
```

---

## Type Safety Best Practices

### 1. API Response Validation

```typescript
import { z } from 'zod';

// Define schema for runtime validation
const DeviceSchema = z.object({
  id: z.string().uuid(),
  deviceCode: z.string(),
  name: z.string(),
  status: z.enum(['online', 'offline', 'running', 'stopped', 'error']),
  mode: z.enum(['auto', 'manual']),
  // ... other fields
});

export async function getDevices(): Promise<Device[]> {
  const response = await fetch('/api/devices');
  const data = await response.json();
  
  // Validate at runtime
  return z.array(DeviceSchema).parse(data);
}
```

### 2. Type Guards

```typescript
export function isDeviceOnline(device: Device): boolean {
  return device.status !== DeviceStatus.OFFLINE;
}

export function canControlDevice(user: UserSession, device: Device): boolean {
  if (!isDeviceOnline(device)) return false;
  if (user.role === UserRole.VIEWER) return false;
  return true;
}
```

---

## Next Steps

1. ✅ TypeScript interfaces defined
2. 📝 Generate OpenAPI contracts based on these interfaces
3. 📝 Implement React components using these types
4. 📝 Set up React Query configuration
5. 📝 Implement WebSocket connection management
