import { prisma } from '../database/connection';
import { logger } from '../utils/logger';
import { TelemetryParameterType, DataQuality, DeviceStatus } from '@prisma/client';

/**
 * 遙測資料介面
 */
interface TelemetryDataPayload {
  temperatures?: {
    exhaust?: number;
    suction?: number;
    waterIn?: number;
    waterOut?: number;
    waterTank?: number;
  };
  pressures?: {
    high?: number;
    low?: number;
  };
  power?: {
    consumptionKw?: number;
    heatOutputKw?: number;
  };
  compressorFrequency?: number;
  components?: Record<string, string>;
}

/**
 * 處理遙測資料
 * 儲存至資料庫、更新設備快取、計算 COP、檢查閾值
 */
export async function processTelemetryData(deviceId: number, data: TelemetryDataPayload): Promise<void> {
  try {
    const timestamp = new Date();

    // 儲存各項遙測參數至 TelemetryData 表
    const telemetryRecords = [];

    // 溫度參數
    if (data.temperatures?.exhaust !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.EXHAUST_TEMPERATURE,
        value: data.temperatures.exhaust,
        dataQuality: validateTemperature(data.temperatures.exhaust, -50, 150),
        timestamp,
      });
    }

    if (data.temperatures?.suction !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.SUCTION_TEMPERATURE,
        value: data.temperatures.suction,
        dataQuality: validateTemperature(data.temperatures.suction, -50, 150),
        timestamp,
      });
    }

    if (data.temperatures?.waterIn !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.WATER_IN_TEMPERATURE,
        value: data.temperatures.waterIn,
        dataQuality: validateTemperature(data.temperatures.waterIn, 0, 100),
        timestamp,
      });
    }

    if (data.temperatures?.waterOut !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.WATER_OUT_TEMPERATURE,
        value: data.temperatures.waterOut,
        dataQuality: validateTemperature(data.temperatures.waterOut, 0, 100),
        timestamp,
      });
    }

    if (data.temperatures?.waterTank !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.WATER_TANK_TEMPERATURE,
        value: data.temperatures.waterTank,
        dataQuality: validateTemperature(data.temperatures.waterTank, 0, 100),
        timestamp,
      });
    }

    // 壓力參數
    if (data.pressures?.high !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.HIGH_PRESSURE,
        value: data.pressures.high,
        dataQuality: validatePressure(data.pressures.high, 0, 5),
        timestamp,
      });
    }

    if (data.pressures?.low !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.LOW_PRESSURE,
        value: data.pressures.low,
        dataQuality: validatePressure(data.pressures.low, 0, 3),
        timestamp,
      });
    }

    // 壓縮機頻率
    if (data.compressorFrequency !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.COMPRESSOR_FREQUENCY,
        value: data.compressorFrequency,
        dataQuality: validateFrequency(data.compressorFrequency, 0, 120),
        timestamp,
      });
    }

    // 功率參數
    if (data.power?.consumptionKw !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.POWER_CONSUMPTION,
        value: data.power.consumptionKw,
        dataQuality: validatePower(data.power.consumptionKw, 0, 100),
        timestamp,
      });
    }

    if (data.power?.heatOutputKw !== undefined) {
      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.HEAT_OUTPUT,
        value: data.power.heatOutputKw,
        dataQuality: validatePower(data.power.heatOutputKw, 0, 500),
        timestamp,
      });
    }

    // 計算 COP (Coefficient of Performance)
    let cop: number | null = null;
    if (data.power?.consumptionKw && data.power?.heatOutputKw && data.power.consumptionKw > 0) {
      cop = data.power.heatOutputKw / data.power.consumptionKw;

      telemetryRecords.push({
        deviceId,
        parameter: TelemetryParameterType.COP,
        value: cop,
        dataQuality: validateCOP(cop),
        timestamp,
      });
    }

    // 批次儲存遙測資料
    if (telemetryRecords.length > 0) {
      await prisma.telemetryData.createMany({
        data: telemetryRecords,
      });
    }

    // 更新設備快取資料（HeatPumpDevice 表的即時參數欄位）
    await prisma.heatPumpDevice.update({
      where: { id: deviceId },
      data: {
        exhaustTemperature: data.temperatures?.exhaust,
        suctionTemperature: data.temperatures?.suction,
        waterInTemperature: data.temperatures?.waterIn,
        waterOutTemperature: data.temperatures?.waterOut,
        waterTankTemperature: data.temperatures?.waterTank,
        highPressure: data.pressures?.high,
        lowPressure: data.pressures?.low,
        compressorFrequency: data.compressorFrequency,
        instantPowerConsumption: data.power?.consumptionKw,
        instantHeatOutput: data.power?.heatOutputKw,
        currentCOP: cop,
        lastDataReceivedAt: timestamp,
        status: DeviceStatus.NORMAL, // 收到資料表示設備在線
      },
    });

    // TODO: 檢查是否超過安全閾值，若超過則建立通知（Phase 3 實作）

    logger.debug({ deviceId, recordCount: telemetryRecords.length }, 'Telemetry data processed');
  } catch (error) {
    logger.error({ error, deviceId }, 'Error processing telemetry data');
    throw error;
  }
}

/**
 * 驗證溫度範圍
 */
function validateTemperature(value: number, min: number, max: number): DataQuality {
  return value >= min && value <= max ? DataQuality.NORMAL : DataQuality.ABNORMAL;
}

/**
 * 驗證壓力範圍
 */
function validatePressure(value: number, min: number, max: number): DataQuality {
  return value >= min && value <= max ? DataQuality.NORMAL : DataQuality.ABNORMAL;
}

/**
 * 驗證頻率範圍
 */
function validateFrequency(value: number, min: number, max: number): DataQuality {
  return value >= min && value <= max ? DataQuality.NORMAL : DataQuality.ABNORMAL;
}

/**
 * 驗證功率範圍
 */
function validatePower(value: number, min: number, max: number): DataQuality {
  return value >= min && value <= max ? DataQuality.NORMAL : DataQuality.ABNORMAL;
}

/**
 * 驗證 COP 值（一般熱泵 COP 值介於 1.5-6.0）
 */
function validateCOP(value: number): DataQuality {
  return value >= 1.0 && value <= 10.0 ? DataQuality.NORMAL : DataQuality.ABNORMAL;
}
