import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { validateSession } from '../services/auth';
import { logger } from '../utils/logger';
import { setWebSocketEmitter } from '../services/mqtt';

let io: SocketIOServer | null = null;

/**
 * 初始化 WebSocket 伺服器
 */
export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    path: '/socket.io',
  });

  // 建立 /realtime 命名空間
  const realtimeNamespace = io.of('/realtime');

  // Session Token 認證中介軟體
  realtimeNamespace.use(async (socket, next) => {
    try {
      const sessionToken = socket.handshake.auth.sessionToken;

      if (!sessionToken) {
        logger.debug('WebSocket connection rejected: missing session token');
        return next(new Error('Authentication error'));
      }

      const session = await validateSession(sessionToken);

      if (!session) {
        logger.debug({ sessionToken }, 'WebSocket connection rejected: invalid session');
        return next(new Error('Authentication error'));
      }

      // 將使用者資訊附加到 socket
      socket.data.userId = session.userId;
      socket.data.username = session.username;
      socket.data.displayName = session.displayName;

      logger.debug(
        { userId: session.userId, socketId: socket.id },
        'WebSocket connection authenticated'
      );

      next();
    } catch (error) {
      logger.error({ error }, 'WebSocket authentication error');
      next(new Error('Authentication error'));
    }
  });

  // 連線事件處理
  realtimeNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info({ userId, socketId: socket.id }, 'WebSocket client connected');

    // 自動加入使用者個人房間（用於接收個人通知）
    socket.join(`user:${userId}`);

    // 自動加入廣播房間（用於接收全域通知）
    socket.join('broadcast');

    // 訂閱設備即時資料
    socket.on('subscribe:device', ({ deviceId }: { deviceId: number }) => {
      socket.join(`device:${deviceId}`);
      logger.info({ userId, deviceId, socketId: socket.id }, 'User subscribed to device');
    });

    // 取消訂閱設備
    socket.on('unsubscribe:device', ({ deviceId }: { deviceId: number }) => {
      socket.leave(`device:${deviceId}`);
      logger.info({ userId, deviceId, socketId: socket.id }, 'User unsubscribed from device');
    });

    // 訂閱通知（實際上已自動加入 broadcast 房間，此事件為可選）
    socket.on('subscribe:notifications', () => {
      logger.debug({ userId, socketId: socket.id }, 'User subscribed to notifications');
    });

    // 斷線事件
    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'WebSocket client disconnected');
    });
  });

  // 設定 MQTT 服務的 WebSocket 發射器
  setWebSocketEmitter((event: string, room: string, data: unknown) => {
    realtimeNamespace.to(room).emit(event, data);
    logger.debug({ event, room }, 'WebSocket event emitted');
  });

  logger.info('✅ WebSocket server initialized');

  return io;
}

/**
 * 取得 Socket.IO 伺服器實例
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * 廣播事件到特定房間
 */
export function emitToRoom(room: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.of('/realtime').to(room).emit(event, data);
  logger.debug({ event, room }, 'Event emitted to room');
}

/**
 * 廣播事件到所有已連線客戶端
 */
export function broadcast(event: string, data: unknown): void {
  emitToRoom('broadcast', event, data);
}

/**
 * 傳送事件到特定使用者
 */
export function emitToUser(userId: number, event: string, data: unknown): void {
  emitToRoom(`user:${userId}`, event, data);
}

/**
 * 傳送事件到訂閱特定設備的客戶端
 */
export function emitToDevice(deviceId: number, event: string, data: unknown): void {
  emitToRoom(`device:${deviceId}`, event, data);
}
