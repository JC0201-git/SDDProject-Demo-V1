import { User as PrismaUser } from '@prisma/client';

/**
 * 使用者介面（對應 Prisma Schema）
 */
export type User = PrismaUser;

/**
 * 使用者登入回應資料
 */
export interface UserLoginResponse {
  userId: number;
  username: string;
  displayName: string;
  sessionExpiresAt: Date;
}

/**
 * 使用者資訊（不包含敏感資料）
 */
export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * Session 資訊
 */
export interface UserSession {
  userId: number;
  username: string;
  displayName: string;
  sessionToken: string;
  sessionExpiresAt: Date;
}
