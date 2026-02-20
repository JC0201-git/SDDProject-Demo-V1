import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateSession } from '../../services/auth';
import { logger } from '../../utils/logger';

/**
 * 擴展 FastifyRequest 以包含使用者資訊
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: number;
      username: string;
      displayName: string;
    };
  }
}

/**
 * 認證中介軟體
 * 從 Cookie 讀取 sessionToken，驗證有效性
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const sessionToken = request.cookies.sessionToken;

  if (!sessionToken) {
    logger.debug({ path: request.url }, 'Missing session token');
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '請先登入',
      },
    });
  }

  const session = await validateSession(sessionToken);

  if (!session) {
    logger.debug({ sessionToken }, 'Invalid or expired session token');
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '登入已過期，請重新登入',
      },
    });
  }

  // 將使用者資訊附加到 request 物件
  request.user = {
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
  };

  logger.debug(
    { userId: session.userId, path: request.url },
    'Request authenticated'
  );
}
