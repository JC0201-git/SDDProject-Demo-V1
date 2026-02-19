# WebSocket 即時通訊規格

**協議**: Socket.IO v4+  
**命名空間**: `/realtime`  
**認證方式**: Session Token（與 HTTP API共用）

---

## 連線建立

### 客戶端連線

```typescript
import { io } from 'socket.io-client';

const socket = io('http://backend-url/realtime', {
  auth: {
    sessionToken: 'user-session-token-from-cookie',
  },
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 5,
});
```

### 伺服器端驗證

```typescript
io.of('/realtime').use(async (socket, next) => {
  const sessionToken = socket.handshake.auth.sessionToken;
  
  // 驗證 Session Token 有效性
  const session = await validateSession(sessionToken);
  
  if (!session) {
    return next(new Error('Authentication error'));
  }
  
  socket.data.userId = session.userId;
  next();
});
```

---

## 事件類型

### 客戶端 → 伺服器

#### 1. `subscribe:device` - 訂閱設備即時資料

**用途**：當使用者進入設備詳細頁面時，訂閱該設備的即時遙測資料推送。

**載荷**：
```typescript
{
  deviceId: number;  // 設備 ID
}
```

**範例**：
```typescript
socket.emit('subscribe:device', { deviceId: 123 });
```

**伺服器行為**：
- 將 Socket 加入 `device:${deviceId}` 房間
- 開始推送該設備的即時遙測資料（每 30 秒）

---

#### 2. `unsubscribe:device` - 取消訂閱設備

**用途**：當使用者離開設備詳細頁面時，取消訂閱以節省資源。

**載荷**：
```typescript
{
  deviceId: number;  // 設備 ID
}
```

**範例**：
```typescript
socket.emit('unsubscribe:device', { deviceId: 123 });
```

**伺服器行為**：
- 將 Socket 從 `device:${deviceId}` 房間移除
- 停止推送該設備的即時資料

---

### 伺服器 → 客戶端

#### 1. `device:telemetry` - 設備遙測資料推送

**用途**：推送設備即時遙測資料至訂閱該設備的所有客戶端。

**觸發時機**：
- 後端從 MQTT 接收到設備遙測資料時
- 約每 30 秒推送一次

**載荷**：
```typescript
{
  deviceId: number;        // 設備 ID
  timestamp: string;       // ISO 8601 時間戳記
  data: {
    temperatures: {
      exhaust: number;     // 排氣溫度（°C）
      suction: number;     // 吸氣溫度（°C）
      waterIn: number;     // 入水溫度（°C）
      waterOut: number;    // 出水溫度（°C）
    };
    pressures: {
      high: number;        // 高壓壓力（MPa）
      low: number;         // 低壓壓力（MPa）
    };
    power: {
      consumptionKw: number;  // 耗電量（kW）
      heatOutputKw: number;   // 產熱量（kW）
      cop: number;            // COP 值
    };
    compressorFrequency: number;  // 壓縮機頻率（Hz）
    components: {
      compressor: 'RUNNING' | 'STOPPED' | 'ERROR';
      fan1: 'RUNNING' | 'STOPPED' | 'ERROR';
      fan2: 'RUNNING' | 'STOPPED' | 'ERROR';
      pump: 'RUNNING' | 'STOPPED' | 'ERROR';
    };
  };
}
```

**客戶端監聽範例**：
```typescript
socket.on('device:telemetry', (payload) => {
  console.log(`收到設備 ${payload.deviceId} 的遙測資料`, payload.data);
  
  // 更新前端 UI（React Query 自動更新）
  queryClient.setQueryData(
    ['device', payload.deviceId, 'telemetry'],
    payload.data
  );
});
```

---

#### 2. `device:status` - 設備狀態變更推送

**用途**：推送設備狀態變更（上線/離線/異常）至所有已登入用戶。

**觸發時機**：
- 設備從 MQTT Broker 連線/斷線時
- 設備參數超過安全閾值時（狀態變更為 ERROR）

**載荷**：
```typescript
{
  deviceId: number;                                // 設備 ID
  deviceName: string;                              // 設備名稱（如「A站」）
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';          // 設備狀態
  previousStatus: 'ONLINE' | 'OFFLINE' | 'ERROR';  // 前次狀態
  timestamp: string;                               // 狀態變更時間（ISO 8601）
  reason?: string;                                 // 變更原因（如「排氣溫度超過閾值」）
}
```

**客戶端監聽範例**：
```typescript
socket.on('device:status', (payload) => {
  console.log(`設備 ${payload.deviceName} 狀態變更：${payload.previousStatus} → ${payload.status}`);
  
  // 更新前端設備列表
  queryClient.invalidateQueries(['devices']);
  
  // 若變更為離線或異常，顯示 Toast 通知
  if (payload.status === 'OFFLINE' || payload.status === 'ERROR') {
    toast.warning(`設備 ${payload.deviceName} ${payload.status === 'OFFLINE' ? '已離線' : '發生異常'}`);
  }
});
```

---

#### 3. `notification:new` - 新通知推送

**用途**：當系統偵測到異常事件時，即時推送通知至所有已登入用戶。

**觸發時機**：
- 設備離線
- 參數超過安全閾值
- 其他異常事件

**載荷**：
```typescript
{
  id: number;                                           // 通知 ID
  eventType: 'DEVICE_OFFLINE' | 'TEMP_ABNORMAL' | 'PRESSURE_ABNORMAL' | 'OTHER_ABNORMAL';
  severity: 'INFO' | 'WARNING' | 'ERROR';              // 嚴重程度
  deviceId: number;                                     // 相關設備 ID
  deviceName: string;                                   // 設備名稱
  message: string;                                      // 通知訊息
  details?: string;                                     // 詳細描述
  timestamp: string;                                    // 發生時間（ISO 8601）
}
```

**客戶端監聽範例**：
```typescript
socket.on('notification:new', (payload) => {
  console.log('收到新通知', payload);
  
  // 更新未讀通知數量
  queryClient.invalidateQueries(['notifications', 'unread-count']);
  
  // 更新通知列表
  queryClient.invalidateQueries(['notifications']);
  
  // 顯示 Toast 通知
  toast(payload.message, {
    type: payload.severity === 'ERROR' ? 'error' : 'warning',
  });
});
```

---

#### 4. `command:ack` - 控制指令確認推送

**用途**：推送控制指令的執行結果至發送該指令的客戶端。

**觸發時機**：
- 設備透過 MQTT 回傳指令確認訊息時
- 約在指令送出後 1-3 秒內推送

**載荷**：
```typescript
{
  commandId: string;                                // 指令 ID（UUID）
  deviceId: number;                                 // 設備 ID
  status: 'ACKNOWLEDGED' | 'TIMEOUT' | 'FAILED';    // 執行狀態
  timestamp: string;                                // 確認時間（ISO 8601）
  message: string;                                  // 回應訊息
}
```

**客戶端監聽範例**：
```typescript
socket.on('command:ack', (payload) => {
  console.log(`控制指令 ${payload.commandId} 執行結果：${payload.status}`);
  
  // 更新指令狀態
  queryClient.setQueryData(['command', payload.commandId], payload);
  
  // 顯示執行結果
  if (payload.status === 'ACKNOWLEDGED') {
    toast.success('指令已成功執行');
  } else {
    toast.error(`指令執行失敗：${payload.message}`);
  }
  
  // 移除「指令傳送中...」的 Loading 狀態
  setCommandLoading(false);
});
```

---

## 房間管理策略

### 伺服器端房間設計

```typescript
io.of('/realtime').on('connection', (socket) => {
  const userId = socket.data.userId;
  
  // 每個使用者自動加入個人房間（用於接收個人通知）
  socket.join(`user:${userId}`);
  
  // 所有使用者自動加入廣播房間（用於接收全域通知）
  socket.join('broadcast');
  
  // 設備訂閱由客戶端主動觸發（subscribe:device 事件）
  socket.on('subscribe:device', ({ deviceId }) => {
    socket.join(`device:${deviceId}`);
    console.log(`用戶 ${userId} 訂閱設備 ${deviceId}`);
  });
  
  socket.on('unsubscribe:device', ({ deviceId }) => {
    socket.leave(`device:${deviceId}`);
    console.log(`用戶 ${userId} 取消訂閱設備 ${deviceId}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`用戶 ${userId} 斷線，原因：${reason}`);
  });
});
```

### 廣播策略

| 事件類型 | 目標房間 | 廣播範圍 |
|---------|---------|---------|
| `device:telemetry` | `device:${deviceId}` | 僅訂閱該設備的客戶端 |
| `device:status` | `broadcast` | 所有已登入用戶 |
| `notification:new` | `broadcast` | 所有已登入用戶 |
| `command:ack` | `user:${userId}` | 僅發送指令的用戶 |

---

## 連線生命週期

### 連線成功

```typescript
socket.on('connect', () => {
  console.log('WebSocket 連線成功', socket.id);
});
```

### 連線錯誤

```typescript
socket.on('connect_error', (error) => {
  console.error('WebSocket 連線錯誤', error.message);
  
  if (error.message === 'Authentication error') {
    // Session 已過期，重新導向至登入頁面
    redirectToLogin();
  }
});
```

### 自動重連

```typescript
socket.on('reconnect', (attemptNumber) => {
  console.log(`WebSocket 重連成功（第 ${attemptNumber} 次嘗試）`);
  
  // 重連後需重新訂閱設備
  const currentDeviceId = getCurrentDeviceId();
  if (currentDeviceId) {
    socket.emit('subscribe:device', { deviceId: currentDeviceId });
  }
});

socket.on('reconnect_error', (error) => {
  console.error('WebSocket 重連失敗', error);
});

socket.on('reconnect_failed', () => {
  console.error('WebSocket 重連失敗（已達最大嘗試次數）');
  toast.error('無法連接至伺服器，請檢查網路連線或稍後再試');
});
```

### 斷線

```typescript
socket.on('disconnect', (reason) => {
  console.log('WebSocket 斷線，原因：', reason);
  
  if (reason === 'io server disconnect') {
    // 伺服器主動斷線（可能是 Session 過期或維護）
    toast.warning('連線已中斷，請重新登入');
    redirectToLogin();
  }
  // 其他情況由 Socket.IO 自動重連
});
```

---

## 前端整合範例

### React Hook 封裝

```typescript
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

export function useDeviceTelemetry(deviceId: number) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!socket || !deviceId) return;
    
    // 訂閱設備即時資料
    socket.emit('subscribe:device', { deviceId });
    
    // 監聽遙測資料推送
    const handleTelemetry = (payload) => {
      if (payload.deviceId === deviceId) {
        queryClient.setQueryData(['device', deviceId, 'telemetry'], payload.data);
      }
    };
    
    // 監聽狀態變更
    const handleStatus = (payload) => {
      if (payload.deviceId === deviceId) {
        queryClient.invalidateQueries(['device', deviceId]);
        
        if (payload.status === 'ERROR') {
          toast.error(`設備 ${payload.deviceName} 發生異常：${payload.reason}`);
        }
      }
    };
    
    socket.on('device:telemetry', handleTelemetry);
    socket.on('device:status', handleStatus);
    
    // 清理：取消訂閱
    return () => {
      socket.emit('unsubscribe:device', { deviceId });
      socket.off('device:telemetry', handleTelemetry);
      socket.off('device:status', handleStatus);
    };
  }, [socket, deviceId, queryClient]);
}
```

### 使用範例

```typescript
function DeviceDetailPage() {
  const { deviceId } = useParams();
  const { data: device } = useQuery(['device', deviceId], () => fetchDevice(deviceId));
  
  // 自動訂閱並監聽即時資料
  useDeviceTelemetry(deviceId);
  
  return (
    <div>
      <h1>{device.name}</h1>
      <TrendChart deviceId={deviceId} />
      <ControlPanel deviceId={deviceId} />
    </div>
  );
}
```

---

## 效能與可靠性

### 心跳檢測

- **Ping 間隔**：25 秒
- **Pong 超時**：60 秒（若未收到回應則視為斷線）
- **自動重連**：最多嘗試 5 次，間隔 2-10 秒

### 訊息頻率限制

| 事件類型 | 頻率限制 | 備註 |
|---------|---------|------|
| `device:telemetry` | 每 30 秒 | 避免過度推送資料 |
| `device:status` | 即時（無限制） | 狀態變更為關鍵事件 |
| `notification:new` | 即時（無限制） | 通知必須即時送達 |
| `command:ack` | 即時（無限制） | 使用者等待指令回應 |

### 斷線重連策略

1. **網路暫時中斷**：自動重連，成功後重新訂閱設備
2. **Session 過期**：伺服器拒絕連線，前端導向登入頁面
3. **伺服器維護**：顯示維護公告，停止重連嘗試

---

## 測試建議

### 單元測試

- Mock Socket.IO 客戶端
- 測試事件監聽與清理邏輯
- 測試重連與錯誤處理

### 整合測試

- 使用 Socket.IO 測試伺服器
- 模擬客戶端連線、訂閱、接收事件
- 驗證房間管理與廣播行為

### 手動測試檢查清單

- [ ] 客戶端能成功連線並接收心跳
- [ ] 訂閱設備後能收到即時遙測資料
- [ ] 設備狀態變更時能收到推送
- [ ] 新通知能即時顯示於前端
- [ ] 控制指令送出後能收到確認訊息
- [ ] 斷線後能自動重連並恢復訂閱
- [ ] Session 過期時能正確導向登入頁面

---

**規格版本**: 1.0.0  
**最後更新**: 2026-02-19
