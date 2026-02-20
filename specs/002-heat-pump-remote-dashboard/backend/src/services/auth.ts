import { prisma } from '../database/connection';
import { verifyPassword, generateSessionToken, calculateSessionExpiry } from '../utils/crypto';
import { logger } from '../utils/logger';
import type { UserLoginResponse, UserSession } from '../models/user';

const MAX_LOGIN_FAILURES = 3;
const ACCOUNT_LOCK_DURATION_MINUTES = 5;

/**
 * 登入錯誤
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 使用者登入
 */
export async function login(username: string, password: string): Promise<UserLoginResponse> {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    logger.warn({ username }, 'Login attempt with non-existent username');
    throw new AuthError('帳號或密碼錯誤', 'INVALID_CREDENTIALS');
  }

  // 檢查帳號是否被鎖定
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    logger.warn({ username, lockedUntil: user.accountLockedUntil }, 'Login attempt on locked account');
    throw new AuthError('帳號已被鎖定，請於 5 分鐘後再試', 'ACCOUNT_LOCKED', 429, {
      lockedUntil: user.accountLockedUntil,
    });
  }

  // 驗證密碼
  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    // 更新失敗計數
    const newFailedCount = user.loginFailedCount + 1;
    const shouldLock = newFailedCount >= MAX_LOGIN_FAILURES;

    const lockUntil = shouldLock
      ? new Date(Date.now() + ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginFailedCount: newFailedCount,
        accountLockedUntil: lockUntil,
      },
    });

    logger.warn(
      { username, failedCount: newFailedCount, locked: shouldLock },
      'Failed login attempt'
    );

    if (shouldLock) {
      throw new AuthError('帳號已被鎖定，請於 5 分鐘後再試', 'ACCOUNT_LOCKED', 429, {
        lockedUntil: lockUntil,
      });
    }

    throw new AuthError('帳號或密碼錯誤', 'INVALID_CREDENTIALS');
  }

  // 登入成功：重置失敗計數、產生 Session Token
  const sessionToken = generateSessionToken();
  const sessionExpiresAt = calculateSessionExpiry(8); // 8 小時

  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginFailedCount: 0,
      accountLockedUntil: null,
      sessionToken,
      sessionExpiresAt,
      lastLoginAt: new Date(),
    },
  });

  logger.info({ userId: user.id, username }, 'User logged in successfully');

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    sessionExpiresAt,
  };
}

/**
 * 使用者登出
 */
export async function logout(sessionToken: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { sessionToken },
  });

  if (!user) {
    logger.warn({ sessionToken }, 'Logout attempt with invalid session token');
    throw new AuthError('Session 無效', 'INVALID_SESSION');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      sessionToken: null,
      sessionExpiresAt: null,
    },
  });

  logger.info({ userId: user.id, username: user.username }, 'User logged out');
}

/**
 * 驗證 Session Token
 */
export async function validateSession(sessionToken: string): Promise<UserSession | null> {
  if (!sessionToken) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { sessionToken },
  });

  if (!user || !user.sessionExpiresAt) {
    return null;
  }

  // 檢查 Session 是否過期
  if (user.sessionExpiresAt < new Date()) {
    logger.info({ userId: user.id, username: user.username }, 'Session expired');
    
    // 清除過期的 Session
    await prisma.user.update({
      where: { id: user.id },
      data: {
        sessionToken: null,
        sessionExpiresAt: null,
      },
    });

    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    sessionToken: user.sessionToken!,
    sessionExpiresAt: user.sessionExpiresAt,
  };
}

/**
 * 取得使用者資訊（透過 Session Token）
 */
export async function getUserBySession(sessionToken: string): Promise<UserSession | null> {
  return validateSession(sessionToken);
}
