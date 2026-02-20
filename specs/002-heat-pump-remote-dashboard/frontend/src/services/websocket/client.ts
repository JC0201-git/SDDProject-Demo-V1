// ============================================================================
// WebSocket 客戶端：實時更新與輪詢降級機制
// ============================================================================
// T063: 實作 WebSocket 即時更新與輪詢降級機制
// - 連接至 `/realtime` 命名空間
// - 監聽 `device:telemetry:update` 事件
// - 自動更新儀表板資料（使用 React Query 的 queryClient.invalidateQueries）
// - 30 秒輪詢降級方案：當 WebSocket 連線失敗或斷線時自動切換
// ============================================================================

import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';

const WS_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';
const POLLING_INTERVAL = 30000; // 30 seconds
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

export class WebSocketClient {
  private socket: Socket | null = null;
  private queryClient: QueryClient | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;

  /**
   * 初始化 WebSocket 客戶端
   */
  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * 連接 WebSocket
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    console.log('[WebSocket] Connecting to', WS_URL);

    this.socket = io(WS_URL, {
      path: '/realtime',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
    });

    this.setupEventListeners();
  }

  /**
   * 設定事件監聽器
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 連接成功
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 停止輪詢降級
      this.stopPolling();

      // 訂閱全域裝置更新
      this.socket?.emit('subscribe:broadcast');
    });

    // 連接失敗
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;
      
      // 超過重試次數，啟動輪詢降級
      if (this.reconnectAttempts >= RECONNECT_ATTEMPTS) {
        console.warn('[WebSocket] Max reconnect attempts reached, falling back to polling');
        this.startPolling();
      }
    });

    // 斷線
    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.isConnected = false;
      
      // 如果是伺服器主動斷線或網路錯誤，啟動輪詢降級
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.startPolling();
      }
    });

    // 重新連接嘗試
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[WebSocket] Reconnect attempt ${attemptNumber}`);
    });

    // 重新連接成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.stopPolling();
    });

    // === 監聽業務事件 ===

    // 裝置遙測資料更新
    this.socket.on('device:telemetry:update', (data: any) => {
      console.log('[WebSocket] Device telemetry update:', data);
      
      // 使 React Query 的設備清單快取失效，觸發重新獲取
      this.queryClient?.invalidateQueries({ queryKey: ['devices'] });
      
      // 如果在設備詳細頁面，也使該設備的快取失效
      if (data.deviceId) {
        this.queryClient?.invalidateQueries({ queryKey: ['device', data.deviceId] });
      }
    });

    // 新通知
    this.socket.on('notification:new', (data: any) => {
      console.log('[WebSocket] New notification:', data);
      
      // 使通知清單快取失效
      this.queryClient?.invalidateQueries({ queryKey: ['notifications'] });
      this.queryClient?.invalidateQueries({ queryKey: ['unreadCount'] });
    });

    // 裝置狀態變更
    this.socket.on('device:status', (data: any) => {
      console.log('[WebSocket] Device status change:', data);
      
      // 使設備清單快取失效
      this.queryClient?.invalidateQueries({ queryKey: ['devices'] });
    });

    // 控制指令確認
    this.socket.on('command:ack', (data: any) => {
      console.log('[WebSocket] Command acknowledged:', data);
      
      // 使指令歷史快取失效
      this.queryClient?.invalidateQueries({ queryKey: ['commands'] });
    });
  }

  /**
   * 啟動輪詢降級機制（每 30 秒刷新一次資料）
   */
  private startPolling(): void {
    if (this.pollingInterval) return;

    console.log('[Polling] Starting fallback polling (30s interval)');
    
    this.pollingInterval = setInterval(() => {
      console.log('[Polling] Fetching data...');
      
      // 強制重新獲取設備清單
      this.queryClient?.invalidateQueries({ queryKey: ['devices'] });
      this.queryClient?.invalidateQueries({ queryKey: ['notifications'] });
      this.queryClient?.invalidateQueries({ queryKey: ['unreadCount'] });
    }, POLLING_INTERVAL);
  }

  /**
   * 停止輪詢降級
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      console.log('[Polling] Stopping fallback polling');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * 訂閱特定裝置的更新（用於裝置詳細頁面）
   */
  subscribeToDevice(deviceId: number): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot subscribe to device');
      return;
    }

    console.log(`[WebSocket] Subscribing to device ${deviceId}`);
    this.socket.emit('subscribe:device', { deviceId });
  }

  /**
   * 取消訂閱裝置更新
   */
  unsubscribeFromDevice(deviceId: number): void {
    if (!this.socket?.connected) return;

    console.log(`[WebSocket] Unsubscribing from device ${deviceId}`);
    this.socket.emit('unsubscribe:device', { deviceId });
  }

  /**
   * 斷開 WebSocket 連接
   */
  disconnect(): void {
    console.log('[WebSocket] Disconnecting');
    
    this.stopPolling();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
  }

  /**
   * 檢查連接狀態
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 單例模式：全域 WebSocket 客戶端實例
let wsClientInstance: WebSocketClient | null = null;

/**
 * 初始化 WebSocket 客戶端（應在 App.tsx 中呼叫）
 */
export function initWebSocket(queryClient: QueryClient): WebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient(queryClient);
    wsClientInstance.connect();
  }
  return wsClientInstance;
}

/**
 * 取得 WebSocket 客戶端實例
 */
export function getWebSocketClient(): WebSocketClient | null {
  return wsClientInstance;
}

/**
 * 清理 WebSocket 連接（應在 App unmount 時呼叫）
 */
export function cleanupWebSocket(): void {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
    wsClientInstance = null;
  }
}
