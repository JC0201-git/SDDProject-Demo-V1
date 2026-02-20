import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../utils/logger';
import { Prisma } from '@prisma/client';

/**
 * 錯誤處理中介軟體
 * 統一處理未捕獲錯誤、資料庫錯誤、驗證錯誤
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  // 記錄錯誤
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      request: {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      },
    },
    'Request error'
  );

  // Prisma 資料庫錯誤
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, reply);
  }

  // Fastify 驗證錯誤
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '請求參數格式錯誤',
        details: error.validation,
      },
    });
  }

  // HTTP 狀態碼錯誤（如 404）
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || 'CLIENT_ERROR',
        message: error.message,
      },
    });
  }

  // 預設：500 內部伺服器錯誤
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? '系統發生錯誤，請稍後再試'
        : error.message,
    },
  });
}

/**
 * 處理 Prisma 資料庫錯誤
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, reply: FastifyReply): FastifyReply {
  switch (error.code) {
    case 'P2002':
      // 唯一性約束違反
      return reply.status(409).send({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '資料已存在',
          details: {
            field: error.meta?.target,
          },
        },
      });

    case 'P2025':
      // 找不到記錄
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到指定的資料',
        },
      });

    case 'P2003':
      // 外鍵約束違反
      return reply.status(400).send({
        success: false,
        error: {
          code: 'FOREIGN_KEY_ERROR',
          message: '關聯的資料不存在',
          details: {
            field: error.meta?.field_name,
          },
        },
      });

    default:
      // 其他資料庫錯誤
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: process.env.NODE_ENV === 'production'
            ? '資料庫操作失敗'
            : error.message,
        },
      });
  }
}
