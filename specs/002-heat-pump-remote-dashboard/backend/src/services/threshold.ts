// ============================================================================
// 服務層：Threshold（閾值檢測）
// ============================================================================
// 實作參數超過閾值檢測邏輯
// ============================================================================

import { PrismaClient, ThresholdParameter } from '@prisma/client';
import { ThresholdModel, ThresholdCheckResult, ThresholdMap } from '../models/threshold';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 閾值檢測服務
 */
export class ThresholdService {
  private thresholdCache: ThresholdMap = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分鐘快取時效

  /**
   * 載入所有閾值配置（帶快取）
   */
  private async loadThresholds(): Promise<ThresholdMap> {
    const now = new Date();
    
    // 檢查快取是否有效
    if (
      this.lastCacheUpdate &&
      now.getTime() - this.lastCacheUpdate.getTime() < this.CACHE_TTL
    ) {
      return this.thresholdCache;
    }

    try {
      const thresholds = await prisma.safetyThreshold.findMany();
      
      this.thresholdCache.clear();
      thresholds.forEach((threshold) => {
        this.thresholdCache.set(threshold.parameter, threshold as ThresholdModel);
      });
      
      this.lastCacheUpdate = now;
      logger.info(`Loaded ${thresholds.length} threshold configurations`);
      
      return this.thresholdCache;
    } catch (error) {
      logger.error('Failed to load thresholds:', error);
      throw error;
    }
  }

  /**
   * 檢測單一參數是否超過閾值
   */
  async checkParameter(
    parameter: ThresholdParameter,
    value: number
  ): Promise<ThresholdCheckResult> {
    const thresholds = await this.loadThresholds();
    const threshold = thresholds.get(parameter);

    if (!threshold) {
      // 沒有配置閾值，視為正常
      return {
        isAbnormal: false,
        parameter,
        value,
        upperLimit: null,
        lowerLimit: null,
        severity: 'WARNING',
      };
    }

    let isAbnormal = false;
    let message: string | undefined;

    // 檢查上限
    if (threshold.upperLimit !== null && value > threshold.upperLimit) {
      isAbnormal = true;
      message = `${parameter} 達到 ${value} ${threshold.unit}，超過安全閾值 ${threshold.upperLimit} ${threshold.unit}`;
    }

    // 檢查下限
    if (threshold.lowerLimit !== null && value < threshold.lowerLimit) {
      isAbnormal = true;
      message = `${parameter} 達到 ${value} ${threshold.unit}，低於安全閾值 ${threshold.lowerLimit} ${threshold.unit}`;
    }

    return {
      isAbnormal,
      parameter,
      value,
      upperLimit: threshold.upperLimit,
      lowerLimit: threshold.lowerLimit,
      severity: threshold.severity,
      message,
    };
  }

  /**
   * 檢測多個參數
   */
  async checkMultipleParameters(
    parameters: Array<{ parameter: ThresholdParameter; value: number }>
  ): Promise<ThresholdCheckResult[]> {
    const results: ThresholdCheckResult[] = [];

    for (const param of parameters) {
      const result = await this.checkParameter(param.parameter, param.value);
      results.push(result);
    }

    return results;
  }

  /**
   * 清除快取（用於測試或配置更新時）
   */
  clearCache(): void {
    this.thresholdCache.clear();
    this.lastCacheUpdate = null;
    logger.info('Threshold cache cleared');
  }

  /**
   * 取得所有閾值配置
   */
  async getAllThresholds(): Promise<ThresholdModel[]> {
    try {
      const thresholds = await prisma.safetyThreshold.findMany({
        orderBy: { parameter: 'asc' },
      });
      return thresholds as ThresholdModel[];
    } catch (error) {
      logger.error('Failed to get all thresholds:', error);
      throw error;
    }
  }
}

// 單例模式
export const thresholdService = new ThresholdService();
