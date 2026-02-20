import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

// 註冊日誌事件
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug({ sql: e.query, duration: e.duration }, 'Database query');
  }
});

prisma.$on('error', (e) => {
  logger.error({ error: e.message }, 'Database error');
});

prisma.$on('warn', (e) => {
  logger.warn({ warning: e.message }, 'Database warning');
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * 測試資料庫連線
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error({ error }, '❌ Database connection failed');
    return false;
  }
}

/**
 * 優雅關閉資料庫連線
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting database');
  }
}
