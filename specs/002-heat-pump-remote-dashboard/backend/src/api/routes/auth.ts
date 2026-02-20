import type { FastifyInstance } from 'fastify';
import { login, logout, getUserBySession, AuthError } from '../../services/auth';
import { authMiddleware } from '../middlewares/auth';
import { logger } from '../../utils/logger';

/**
 * 認證 API 路由
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/login
   * 使用者登入
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      // 基本驗證
      if (!username || !password) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '請提供帳號與密碼',
          },
        });
      }

      if (username.length < 3 || username.length > 50) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '帳號長度必須在 3-50 字元之間',
            details: { field: 'username' },
          },
        });
      }

      const userInfo = await login(username, password);

      // 設定 HttpOnly Cookie
      reply.setCookie('sessionToken', userInfo.userId.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60, // 8 小時
        path: '/',
      });

      return reply.send({
        success: true,
        message: '登入成功',
        data: userInfo,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
      }

      logger.error({ error }, 'Login error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '系統發生錯誤，請稍後再試',
        },
      });
    }
  });

  /**
   * POST /api/auth/logout
   * 使用者登出
   */
  fastify.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const sessionToken = request.cookies.sessionToken;

      if (sessionToken) {
        await logout(sessionToken);
      }

      // 清除 Cookie
      reply.clearCookie('sessionToken', {
        path: '/',
      });

      return reply.send({
        success: true,
        message: '登出成功',
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      logger.error({ error }, 'Logout error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '系統發生錯誤，請稍後再試',
        },
      });
    }
  });

  /**
   * GET /api/auth/session
   * 檢查 Session 有效性
   */
  fastify.get('/session', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const sessionToken = request.cookies.sessionToken;

      if (!sessionToken) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '請先登入',
          },
        });
      }

      const session = await getUserBySession(sessionToken);

      if (!session) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '登入已過期，請重新登入',
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          userId: session.userId,
          username: session.username,
          displayName: session.displayName,
          sessionExpiresAt: session.sessionExpiresAt,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Session check error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '系統發生錯誤，請稍後再試',
        },
      });
    }
  });
}
