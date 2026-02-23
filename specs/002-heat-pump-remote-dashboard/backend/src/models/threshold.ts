// ============================================================================
// 模型層：SafetyThreshold（安全閾值）
// ============================================================================
// 定義閾值配置介面
// ============================================================================

import { ThresholdParameter, ThresholdSeverity } from '@prisma/client';

/**
 * 安全閾值實體介面（對應 Prisma Schema）
 */
export interface ThresholdModel {
  id: number;
  parameter: ThresholdParameter;
  upperLimit: number | null;
  lowerLimit: number | null;
  unit: string;
  severity: ThresholdSeverity;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 閾值檢測結果
 */
export interface ThresholdCheckResult {
  isAbnormal: boolean;
  parameter: ThresholdParameter;
  value: number;
  upperLimit: number | null;
  lowerLimit: number | null;
  severity: ThresholdSeverity;
  message?: string;
}

/**
 * 閾值映射（參數名稱 -> 閾值配置）
 */
export type ThresholdMap = Map<ThresholdParameter, ThresholdModel>;
