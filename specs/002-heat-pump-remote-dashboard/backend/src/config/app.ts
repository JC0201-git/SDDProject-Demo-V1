import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'change-this-in-production',
  sessionExpireHours: parseInt(process.env.SESSION_EXPIRE_HOURS || '8', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Safety
  maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '3', 10),
  rateLimitControlSeconds: parseInt(process.env.RATE_LIMIT_CONTROL_SECONDS || '10', 10),
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '30', 10),
  notificationRetentionDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '7', 10),
  deviceOfflineThresholdSeconds: parseInt(
    process.env.DEVICE_OFFLINE_THRESHOLD_SECONDS || '30',
    10
  ),
};

export type AppConfig = typeof config;
