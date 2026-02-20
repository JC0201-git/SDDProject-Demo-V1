import mqtt from 'mqtt';
import { mqttConfig } from '../config/mqtt';
import { logger } from '../utils/logger';
import { processTelemetryData } from './telemetry';
import { prisma } from '../database/connection';
import { DeviceStatus, ComponentStatus, ControlCommandStatus, ThresholdParameter } from '@prisma/client';
import { thresholdService } from './threshold';
import { notificationService } from './notification';
import { deviceService } from './device';

let mqttClient: mqtt.MqttClient | null = null;
let websocketEmitter: ((event: string, room: string, data: unknown) => void) | null = null;

/**
 * 設定 WebSocket 發射器（由 WebSocket 服務呼叫）
 */
export function setWebSocketEmitter(emitter: (event: string, room: string, data: unknown) => void): void {
  websocketEmitter = emitter;
}

/**
 * 連線到 MQTT Broker
 */
export async function connectMqtt(): Promise<void> {
  return new Promise((resolve, reject) => {
    mqttClient = mqtt.connect(mqttConfig.brokerUrl, {
      clientId: mqttConfig.clientId,
      username: mqttConfig.username,
      password: mqttConfig.password,
      reconnectPeriod: mqttConfig.reconnectPeriod,
      connectTimeout: mqttConfig.connectTimeout,
      keepalive: mqttConfig.keepalive,
      clean: mqttConfig.clean,
      will: mqttConfig.will,
    });

    mqttClient.on('connect', () => {
      logger.info('✅ MQTT client connected');

      // 訂閱所有設備的遙測資料、指令確認與狀態 Topics
      const topics = [
        mqttConfig.topics.telemetry,
        mqttConfig.topics.commandAck,
        mqttConfig.topics.status,
      ];

      mqttClient?.subscribe(topics, { qos: mqttConfig.qos }, (err) => {
        if (err) {
          logger.error({ error: err }, 'Failed to subscribe to MQTT topics');
          reject(err);
        } else {
          logger.info({ topics }, 'Subscribed to MQTT topics');
          resolve();
        }
      });
    });

    mqttClient.on('error', (error) => {
      logger.error({ error }, 'MQTT connection error');
      reject(error);
    });

    mqttClient.on('reconnect', () => {
      logger.info('MQTT client reconnecting...');
    });

    mqttClient.on('offline', () => {
      logger.warn('MQTT client offline');
    });

    mqttClient.on('message', handleMqttMessage);
  });
}

/**
 * 處理 MQTT 訊息
 */
async function handleMqttMessage(topic: string, payload: Buffer): Promise<void> {
  try {
    const message = payload.toString();
    logger.debug({ topic, message }, 'Received MQTT message');

    // 解析 Topic 取得設備編號
    const topicParts = topic.split('/');
    const deviceCode = topicParts[1];

    if (!deviceCode) {
      logger.warn({ topic }, 'Invalid topic format');
      return;
    }

    // 根據 Topic 類型處理訊息
    if (topic.includes('/telemetry')) {
      await handleTelemetryMessage(deviceCode, message);
    } else if (topic.includes('/command-ack')) {
      await handleCommandAckMessage(deviceCode, message);
    } else if (topic.includes('/status')) {
      await handleStatusMessage(deviceCode, message);
    }
  } catch (error) {
    logger.error({ error, topic }, 'Error handling MQTT message');
  }
}

/**
 * 處理遙測資料訊息
 * Topic: devices/{deviceCode}/telemetry
 */
async function handleTelemetryMessage(deviceCode: string, message: string): Promise<void> {
  try {
    const data = JSON.parse(message);

    // 查詢設備
    const device = await prisma.heatPumpDevice.findUnique({
      where: { deviceCode },
    });

    if (!device) {
      logger.warn({ deviceCode }, 'Device not found for telemetry data');
      return;
    }

    // 處理遙測資料（儲存至資料庫、計算 COP）
    await processTelemetryData(device.id, data);

    // === T049: 整合閾值檢測與異常通知 ===
    // 檢測各參數是否超過安全閾值
    const parametersToCheck: Array<{ parameter: ThresholdParameter; value: number; unit: string }> = [];

    if (data.exhaustTemperature !== undefined) {
      parametersToCheck.push({
        parameter: 'EXHAUST_TEMPERATURE',
        value: data.exhaustTemperature,
        unit: '°C',
      });
    }
    if (data.highPressure !== undefined) {
      parametersToCheck.push({
        parameter: 'HIGH_PRESSURE',
        value: data.highPressure,
        unit: 'MPa',
      });
    }
    if (data.lowPressure !== undefined) {
      parametersToCheck.push({
        parameter: 'LOW_PRESSURE',
        value: data.lowPressure,
        unit: 'MPa',
      });
    }
    if (data.waterTankTemperature !== undefined) {
      parametersToCheck.push({
        parameter: 'WATER_TANK_TEMPERATURE',
        value: data.waterTankTemperature,
        unit: '°C',
      });
    }
    if (data.compressorFrequency !== undefined) {
      parametersToCheck.push({
        parameter: 'COMPRESSOR_FREQUENCY',
        value: data.compressorFrequency,
        unit: 'Hz',
      });
    }

    // 執行閾值檢測
    let hasAbnormal = false;
    for (const param of parametersToCheck) {
      const checkResult = await thresholdService.checkParameter(param.parameter, param.value);
      
      if (checkResult.isAbnormal) {
        hasAbnormal = true;
        
        // 產生異常通知
        await notificationService.createAbnormalNotification(
          device.id,
          device.deviceName,
          param.parameter,
          param.value,
          param.unit,
          checkResult.upperLimit || checkResult.lowerLimit || 0,
          checkResult.severity === 'ERROR' ? 'ERROR' : 'WARNING'
        );

        // 透過 WebSocket 推送新通知
        if (websocketEmitter) {
          websocketEmitter('notification:new', 'broadcast', {
            eventType: param.parameter.includes('TEMPERATURE') ? 'TEMPERATURE_ABNORMAL' : 
                       param.parameter.includes('PRESSURE') ? 'PRESSURE_ABNORMAL' : 'OTHER_ABNORMAL',
            severity: checkResult.severity === 'ERROR' ? 'ERROR' : 'WARNING',
            deviceId: device.id,
            deviceName: device.deviceName,
            message: checkResult.message,
            timestamp: new Date().toISOString(),
          });
        }

        logger.warn({ 
          deviceId: device.id, 
          parameter: param.parameter, 
          value: param.value, 
          message: checkResult.message 
        }, 'Parameter threshold exceeded');
      }
    }

    // 更新設備狀態：若有異常則標記為 ABNORMAL，否則為 NORMAL
    const newStatus: DeviceStatus = hasAbnormal ? 'ABNORMAL' : 'NORMAL';
    await deviceService.updateDeviceStatus(device.id, newStatus);

    // 透過 WebSocket 推送至訂閱該設備的客戶端
    if (websocketEmitter) {
      websocketEmitter('device:telemetry', `device:${device.id}`, {
        deviceId: device.id,
        timestamp: new Date().toISOString(),
        data,
      });

      // 推送至全域頻道（用於儀表板即時更新）
      websocketEmitter('device:telemetry:update', 'broadcast', {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
    }

    logger.debug({ deviceId: device.id, deviceCode, status: newStatus }, 'Telemetry data processed and pushed');
  } catch (error) {
    logger.error({ error, deviceCode, message }, 'Error processing telemetry message');
  }
}

/**
 * 處理控制指令確認訊息
 * Topic: devices/{deviceCode}/command-ack
 */
async function handleCommandAckMessage(deviceCode: string, message: string): Promise<void> {
  try {
    const data = JSON.parse(message) as {
      commandId: string;
      status: 'ACKNOWLEDGED' | 'FAILED';
      errorMessage?: string;
    };

    // 查詢設備
    const device = await prisma.heatPumpDevice.findUnique({
      where: { deviceCode },
    });

    if (!device) {
      logger.warn({ deviceCode }, 'Device not found for command ack');
      return;
    }

    // 更新控制指令狀態
    const command = await prisma.controlCommand.update({
      where: { id: data.commandId },
      data: {
        status: data.status === 'ACKNOWLEDGED' ? ControlCommandStatus.ACKNOWLEDGED : ControlCommandStatus.FAILED,
        acknowledgedAt: new Date(),
        errorMessage: data.errorMessage || null,
      },
      include: {
        user: true,
      },
    });

    // 透過 WebSocket 推送至發送指令的使用者
    if (websocketEmitter) {
      websocketEmitter('command:ack', `user:${command.userId}`, {
        commandId: command.id,
        deviceId: device.id,
        status: command.status,
        timestamp: command.acknowledgedAt?.toISOString(),
        message: data.status === 'ACKNOWLEDGED' ? '指令已成功執行' : `指令執行失敗：${data.errorMessage}`,
      });
    }

    logger.info(
      { commandId: data.commandId, deviceCode, status: data.status },
      'Command acknowledgement processed'
    );
  } catch (error) {
    logger.error({ error, deviceCode, message }, 'Error processing command ack message');
  }
}

/**
 * 處理設備狀態訊息
 * Topic: devices/{deviceCode}/status
 */
async function handleStatusMessage(deviceCode: string, message: string): Promise<void> {
  try {
    const data = JSON.parse(message) as {
      status: 'ONLINE' | 'OFFLINE';
      components?: Array<{
        componentCode: string;
        status: 'RUNNING' | 'STOPPED' | 'ABNORMAL';
      }>;
    };

    // 查詢設備
    const device = await prisma.heatPumpDevice.findUnique({
      where: { deviceCode },
    });

    if (!device) {
      logger.warn({ deviceCode }, 'Device not found for status update');
      return;
    }

    const previousStatus = device.status;
    const newStatus = data.status === 'ONLINE' ? DeviceStatus.NORMAL : DeviceStatus.OFFLINE;

    // 更新設備狀態
    await prisma.heatPumpDevice.update({
      where: { id: device.id },
      data: {
        status: newStatus,
        lastDataReceivedAt: new Date(),
      },
    });

    // 更新零件狀態
    if (data.components) {
      for (const comp of data.components) {
        await prisma.component.updateMany({
          where: {
            deviceId: device.id,
            componentCode: comp.componentCode,
          },
          data: {
            status: comp.status as ComponentStatus,
          },
        });
      }
    }

    // 若狀態變更為離線，建立通知
    if (newStatus === DeviceStatus.OFFLINE && previousStatus !== DeviceStatus.OFFLINE) {
      await prisma.notification.create({
        data: {
          eventType: 'DEVICE_OFFLINE',
          severity: 'WARNING',
          deviceId: device.id,
          title: `設備 ${device.deviceName} 已離線`,
          description: `設備於 ${new Date().toLocaleString('zh-TW')} 離線`,
          occurredAt: new Date(),
        },
      });

      // 透過 WebSocket 推送通知
      if (websocketEmitter) {
        websocketEmitter('notification:new', 'broadcast', {
          eventType: 'DEVICE_OFFLINE',
          severity: 'WARNING',
          deviceId: device.id,
          deviceName: device.deviceName,
          message: `設備 ${device.deviceName} 已離線`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 透過 WebSocket 推送狀態變更
    if (websocketEmitter && previousStatus !== newStatus) {
      websocketEmitter('device:status', 'broadcast', {
        deviceId: device.id,
        deviceName: device.deviceName,
        status: data.status,
        previousStatus: previousStatus,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(
      { deviceId: device.id, deviceCode, status: data.status },
      'Device status updated'
    );
  } catch (error) {
    logger.error({ error, deviceCode, message }, 'Error processing status message');
  }
}

/**
 * 發布控制指令到設備
 */
export async function publishCommand(deviceCode: string, command: Record<string, unknown>): Promise<void> {
  if (!mqttClient || !mqttClient.connected) {
    throw new Error('MQTT client not connected');
  }

  const topic = mqttConfig.topics.command(deviceCode);
  const payload = JSON.stringify(command);

  return new Promise((resolve, reject) => {
    mqttClient?.publish(topic, payload, { qos: mqttConfig.qos }, (err) => {
      if (err) {
        logger.error({ error: err, deviceCode, command }, 'Failed to publish command');
        reject(err);
      } else {
        logger.info({ deviceCode, command }, 'Command published to device');
        resolve();
      }
    });
  });
}

/**
 * 中斷 MQTT 連線
 */
export async function disconnectMqtt(): Promise<void> {
  if (mqttClient) {
    return new Promise((resolve) => {
      mqttClient?.end(false, {}, () => {
        logger.info('MQTT client disconnected');
        resolve();
      });
    });
  }
}
